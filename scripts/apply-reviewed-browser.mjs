/** Use the app's normal edit form when no local database credentials are available.
 * Temporary tools: npm install --prefix /tmp/tawa-browser playwright @sparticuz/chromium
 * Default is read-only preview. --apply explicitly enables saving verified empty fields.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { SPEC_FIELDS, parseSpecExtraction, planSpecBackfill } from '../lib/equipment-specs.js';
const { values } = parseArgs({ options: {
  reviewed: { type:'string', default:'data/extractions/reviewed-specs.json' },
  snapshot: { type:'string', default:'data/extractions/catalog-snapshot.json' },
  tools: { type:'string', default:'/tmp/tawa-browser' },
  item: { type:'string', multiple:true },
  apply: { type:'boolean', default:false },
} });
const snapshot = JSON.parse(await readFile(values.snapshot,'utf8')).equipment;
const raw = JSON.parse(await readFile(values.reviewed,'utf8'));
if (!Array.isArray(raw)) throw new Error('Expected reviewed array');
const seen = new Set();
const entries = raw.map(entry=> {
  const item=snapshot.find(item=>item.id===entry.equipmentId && item.masterItemNo===entry.itemNo);
  if (!item || seen.has(item.id) || item.pdfUrl!==entry.pdfUrl || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid review identity/source');
  seen.add(item.id);
  return { ...entry, item, extraction:parseSpecExtraction(entry.extraction) };
}).filter(entry=>!values.item || values.item.includes(String(entry.itemNo)));
const requireTools = createRequire(resolve(values.tools,'package.json'));
const { chromium: playwright } = requireTools('playwright');
const chromiumModule = requireTools('@sparticuz/chromium');
const chromium = chromiumModule.default ?? chromiumModule;
const reportPath=`${values.reviewed}.browser-${Date.now()}.json`;
const report={ mode:values.apply?'apply':'preview', records:[] };
const saveReport=()=>writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
await saveReport();
let browser=await playwright.launch({args:chromium.args, executablePath:await chromium.executablePath()});
try {
  let page=await browser.newPage({viewport:{width:1440,height:1000}});
  // PDFs are already reviewed; do not re-download them just to display the edit form.
  await page.route('https://*.supabase.co/storage/v1/object/public/**',route=>route.abort());
  const url='https://tawa-equipment-app.vercel.app/catalog';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  async function openEditor(number) {
    await page.getByRole('button',{name:new RegExp(`^Open equipment #${number},`)}).click();
    const pdfUrl=await page.locator('aside iframe[title="Spec PDF"]').getAttribute('src');
    await page.getByRole('button',{name:'Edit equipment',exact:true}).click();
    await page.locator('aside form input[name="description"]').waitFor();
    return pdfUrl;
  }
  async function readForm() {
    return page.locator('aside form input, aside form textarea, aside form select').evaluateAll(es=>Object.fromEntries(es.filter(e=>e.name && e.type!=='file').map(e=>[e.name,e.type==='checkbox'?e.checked:e.value])));
  }
  let processed = 0;
  for (const entry of entries) {
    // Bound browser lifetime to avoid accumulated PDF/frame memory across many edits.
    if (processed > 0 && processed % 3 === 0) {
      await browser.close();
      browser=await playwright.launch({args:chromium.args, executablePath:await chromium.executablePath()});
      page=await browser.newPage({viewport:{width:1440,height:1000}});
      await page.route('https://*.supabase.co/storage/v1/object/public/**',route=>route.abort());
      await page.goto(url,{waitUntil:'domcontentloaded'});
    }
    processed++;
    const record={itemNo:entry.itemNo, equipmentId:entry.equipmentId, source:{pdfUrl:entry.pdfUrl,sha256:entry.sha256},extraction:entry.extraction};
    report.records.push(record);
    try {
      const linkedPdf=await openEditor(entry.itemNo);
      const before=await readForm();
      record.before=before;
      if (linkedPdf!==entry.pdfUrl || ['description','manufacturer','model'].some(f=>(before[f]||'').trim()!==(entry.item[f]||'').trim())) throw new Error('Equipment identity/PDF changed since review');
      const current=Object.fromEntries(SPEC_FIELDS.map(f=>[f,before[f]]));
      const changes=planSpecBackfill(current,entry.extraction);
      record.changes=changes;
      if (entry.extraction.match!=='matched') record.status='review';
      else if (!Object.keys(changes).length) record.status='unchanged';
      else if (!values.apply) record.status='proposed';
      else {
        for (const [field,value] of Object.entries(changes)) await page.locator(`aside form [name="${field}"]`).fill(value);
        const prepared=await readForm();
        // Every other form field must remain exactly as it was before editing.
        for (const [field,value] of Object.entries(before)) if (!(field in changes) && prepared[field]!==value) throw new Error(`Unexpected form change: ${field}`);
        record.status='pending_write';
        await saveReport();
        await page.getByRole('button',{name:'Save changes',exact:true}).click();
        await page.getByRole('button',{name:'Save changes',exact:true}).waitFor({state:'hidden',timeout:30000});
        // Fresh server render + reopening edit form confirms stored values and all untouched fields.
        await page.goto(url,{waitUntil:'domcontentloaded'});
        const savedPdf=await openEditor(entry.itemNo);
        const after=await readForm();
        if (savedPdf!==linkedPdf) throw new Error('Associated PDF changed after saving');
        for (const [field,value] of Object.entries(before)) {
          const expected=field in changes?changes[field]:value;
          if (after[field]!==expected) throw new Error(`Readback mismatch: ${field}`);
        }
        record.after=after;
        record.status='updated_verified';
      }
      console.log(JSON.stringify({itemNo:entry.itemNo,status:record.status,changes}));
      await saveReport();
      await page.keyboard.press('Escape');
    } catch (error) {
      record.status='failed'; record.error=String(error?.message??error).slice(0,1000);
      await saveReport();
      console.error(`#${entry.itemNo}: ${record.error}`);
      process.exitCode=1;
      break; // Stop on any uncertain save; never retry blindly.
    }
  }
} finally { await browser.close(); }
console.log(`Report: ${reportPath}`);
