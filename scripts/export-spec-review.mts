/** Export reviewed PDF evidence and verified UI writes into shareable audit artifacts. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import ExcelJS from 'exceljs';
import { parseSpecExtraction, planSpecBackfill, SPEC_FIELDS } from '../lib/equipment-specs.js';
import type { EquipmentDTO } from '../lib/types.js';
const {values}=parseArgs({options:{directory:{type:'string',default:'data/extractions'},output:{type:'string',default:'docs/PDF-SPEC-REVIEW-2026-11-13'}}});
const directory=values.directory!;
const snapshot=JSON.parse(await readFile(`${directory}/catalog-snapshot.json`,'utf8')) as {equipment:EquipmentDTO[]};
type Review={itemNo:number;equipmentId:string;pdfUrl:string;sha256:string;extraction:ReturnType<typeof parseSpecExtraction>};
type WriteRecord={itemNo:number;equipmentId:string;status:string;changes?:Record<string,string>;before?:Record<string,string>;after?:Record<string,string>;source:{pdfUrl:string;sha256:string}};
const reviewed=JSON.parse(await readFile(`${directory}/reviewed-specs.json`,'utf8')) as Review[];
const withPdf=snapshot.equipment.filter(e=>e.pdfUrl);
if(new Set(reviewed.map(r=>r.equipmentId)).size!==reviewed.length || reviewed.length!==withPdf.length)throw Error('Review does not cover every PDF record exactly once');
const history=new Map<number,WriteRecord[]>();
for(const filename of (await readdir(directory)).filter(f=>/\.browser-\d+\.json$/.test(f)).sort()){
 const report=JSON.parse(await readFile(`${directory}/${filename}`,'utf8')) as {mode:string;records:WriteRecord[]};
 if(report.mode!=='apply')continue;
 for(const record of report.records){
  if(!['updated_verified','unchanged'].includes(record.status))continue;
  history.set(record.itemNo,[...(history.get(record.itemNo)??[]),record]);
 }
}
const records=reviewed.map(r=>{
 const e=withPdf.find(e=>e.id===r.equipmentId && e.masterItemNo===r.itemNo && e.pdfUrl===r.pdfUrl);
 if(!e || !/^[a-f0-9]{64}$/.test(r.sha256))throw Error('Invalid identity/source');
 r.extraction=parseSpecExtraction(r.extraction);
 const writes=(history.get(r.itemNo)??[]).filter(w=>w.equipmentId===r.equipmentId && w.source.pdfUrl===r.pdfUrl && w.source.sha256===r.sha256);
 const latest=writes.at(-1);
 const current=latest?.after??latest?.before??e;
 const pending=planSpecBackfill(current,r.extraction);
 const changes:Record<string,{before:string|null;after:string}>={};
 for(const w of writes.filter(w=>w.status==='updated_verified'))for(const [field,value] of Object.entries(w.changes??{})){
  changes[field]={before:changes[field]?.before??w.before?.[field]??null,after:value};
 }
 const disposition=r.extraction.match!=='matched'?'needs_confirmation':Object.keys(pending).length?'pending_apply':Object.keys(changes).length?'updated_verified':latest?'existing_verified':'retained_existing_or_no_new_facts';
 return {...r,description:e.description,manufacturer:e.manufacturer,model:e.model,disposition,changes,pending,verifiedFields:latest?Object.fromEntries(SPEC_FIELDS.map(f=>[f,current[f]??null])):null};
});
const count=(field:'disposition'|'match')=>records.reduce((a,r)=>{const key=field==='match'?r.extraction.match:r.disposition;a[key]=(a[key]??0)+1;return a;},{} as Record<string,number>);
const summary={date:'2026-11-13',catalogCount:snapshot.equipment.length,pdfCount:withPdf.length,reviewedCount:records.length,matchCounts:count('match'),dispositionCounts:count('disposition')};
await writeFile(`${values.output}.json`,JSON.stringify({summary,records},null,2)+'\n');
const book=new ExcelJS.Workbook();book.creator='TAWA Equipment';
const sheet=book.addWorksheet('All PDF equipment',{views:[{state:'frozen',ySplit:1}]});
sheet.columns=[{header:'Equipment #',key:'itemNo',width:14},{header:'Description',key:'description',width:40},{header:'Manufacturer',key:'manufacturer',width:22},{header:'Catalog model',key:'model',width:30},{header:'PDF match',key:'match',width:18},{header:'Online status',key:'disposition',width:28},{header:'Reason / discrepancies',key:'reason',width:90},{header:'Verified changes',key:'changes',width:90},{header:'PDF source',key:'pdfUrl',width:40},{header:'SHA-256',key:'sha256',width:24}];
for(const r of records)sheet.addRow({...r,match:r.extraction.match,reason:r.extraction.reason,changes:Object.entries(r.changes).map(([f,v])=>`${f}: ${v.after}`).join('\n')});
const evidence=book.addWorksheet('Source evidence',{views:[{state:'frozen',ySplit:1}]});
evidence.columns=[{header:'Equipment #',key:'itemNo',width:14},{header:'Field',key:'field',width:20},{header:'Value',key:'value',width:80},{header:'PDF page',key:'page',width:12},{header:'Source excerpt / drawing labels',key:'quote',width:100}];
for(const r of records)for(const item of r.extraction.evidence)evidence.addRow({itemNo:r.itemNo,...item});
for(const tab of [sheet,evidence]){
 tab.autoFilter={from:{row:1,column:1},to:{row:tab.rowCount,column:tab.columnCount}};
 tab.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};tab.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF26394D'}};
 tab.eachRow((row,i)=>{if(i>1){row.alignment={vertical:'top',wrapText:true};if(tab===sheet){const r=records[i-2];row.getCell(5).fill={type:'pattern',pattern:'solid',fgColor:{argb:r.extraction.match==='matched'?'FFDFF0D8':r.extraction.match==='mismatch'?'FFF2DEDE':'FFFCF8E3'}};}}});
}
await book.xlsx.writeFile(`${values.output}.xlsx`);
console.log(JSON.stringify(summary,null,2));
if(summary.dispositionCounts.pending_apply)process.exitCode=1;
