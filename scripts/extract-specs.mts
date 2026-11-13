/** Read hosted PDFs, extract model-specific evidence, and fill empty equipment fields. */
import { existsSync } from "node:fs";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { SPEC_FIELDS, extractEquipmentSpecs, planSpecBackfill } from "../lib/equipment-specs.js";

const { values } = parseArgs({ options: {
  apply: { type: "boolean", default: false },
  item: { type: "string", multiple: true },
  limit: { type: "string" },
  report: { type: "string" },
  help: { type: "boolean", default: false },
} });
if (values.help) {
  console.log(`Usage: npm run extract:specs -- [--apply] [--item 174] [--item 182] [--limit 5] [--report path.json]
Default: extract and save an audit report; no database writes.
--apply: fill empty fields only; never overwrite existing equipment values.
Mechanical/ventilation/refrigeration details go into remarks when remarks is empty.
Configure DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, GEMINI_API_KEY in .env.local or .env.
GEMINI_MODEL and SUPABASE_PDF_BUCKET are optional. Store records are never modified.`);
  process.exit(0);
}
function positiveInt(value: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }
  return Number(value);
}
const itemNos = values.item?.map(positiveInt);
const limit = values.limit ? positiveInt(values.limit) : undefined;
// Existing process variables take precedence; .env.local takes precedence over .env.
for (const file of [".env.local", ".env"]) if (existsSync(file)) loadEnvFile(file);
const missing = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "GEMINI_API_KEY"].filter(key => !process.env[key]);
if (missing.length) {
  console.error(`Missing configuration: ${missing.join(", ")}. No PDFs read or data changed.`);
  process.exit(1);
}
const { pdfPublicUrl } = await import("../lib/supabase.js");
const prisma = new PrismaClient();
const reportPath = resolve(values.report ?? `data/extractions/specs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const report = {
  startedAt: new Date().toISOString(),
  mode: values.apply ? "apply" : "preview",
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  records: [] as Record<string, unknown>[],
  summary: { scanned: 0, updated: 0, proposed: 0, review: 0, unchanged: 0, stale: 0, failed: 0 },
};
async function saveReport() {
  await writeFile(`${reportPath}.tmp`, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  await rename(`${reportPath}.tmp`, reportPath);
}
try {
  await mkdir(dirname(reportPath), { recursive: true });
  await saveReport(); // Fail before any database writes if an audit file cannot be created.
  const items = await prisma.equipment.findMany({
    where: {
      pdf: { is: { storagePath: { not: null } } },
      ...(itemNos ? { masterItemNo: { in: itemNos } } : {}),
    },
    include: { pdf: true }, orderBy: { masterItemNo: "asc" },
  });
  const candidates = items.filter(item => SPEC_FIELDS.some(field => !item[field]?.trim())).slice(0, limit);
  console.log(`${report.mode}: ${candidates.length} equipment records. Report: ${reportPath}`);
  for (const item of candidates) {
    const record: Record<string, unknown> = {
      id: item.id, itemNo: item.masterItemNo, description: item.description,
      manufacturer: item.manufacturer, model: item.model, pdfId: item.pdfId,
      storagePath: item.pdf?.storagePath, updatedAt: item.updatedAt.toISOString(),
      status: "extracting",
    };
    report.records.push(record);
    report.summary.scanned++;
    try {
      const url = pdfPublicUrl(item.pdf?.storagePath);
      if (!url) throw new Error("Missing PDF public URL");
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`PDF HTTP ${response.status}`);
      // Bound download size so oversized/corrupt objects do not exhaust memory or API limits.
      const maxBytes = 14 * 1024 * 1024;
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw new Error("PDF exceeds 14 MB inline extraction limit; needs manual processing");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty PDF response");
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > maxBytes) {
            await reader.cancel();
            throw new Error("PDF exceeds 14 MB inline extraction limit; needs manual processing");
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = Buffer.concat(chunks);
      if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))) throw new Error("Downloaded object is not a PDF");
      const extraction = await extractEquipmentSpecs(bytes, item);
      const changes = planSpecBackfill(item, extraction);
      record.extraction = extraction;
      record.before = Object.fromEntries(SPEC_FIELDS.map(field => [field, item[field]]));
      record.changes = changes;
      if (extraction.match !== "matched") {
        record.status = "review";
        report.summary.review++;
      } else if (!Object.keys(changes).length) {
        record.status = "unchanged";
        report.summary.unchanged++;
      } else if (!values.apply) {
        record.status = "proposed";
        report.summary.proposed++;
      } else {
        record.status = "pending_write";
        await saveReport(); // Write intended values and before snapshot BEFORE mutating data.
        // Skip if a person edits the equipment or replaces its PDF during extraction.
        const result = await prisma.equipment.updateMany({
          where: { id: item.id, updatedAt: item.updatedAt, pdfId: item.pdfId },
          data: changes,
        });
        record.status = result.count === 1 ? "updated" : "stale";
        report.summary[result.count === 1 ? "updated" : "stale"]++;
      }
      console.log(`#${item.masterItemNo}: ${record.status} (${Object.keys(changes).length} fields)`);
    } catch (error) {
      record.status = "failed";
      // Avoid storing database URLs, provider response bodies or signed/authenticated URLs.
      record.error = error instanceof Error && /^(PDF HTTP|Gemini HTTP|Incomplete Gemini|Empty Gemini|Invalid |Missing PDF|Downloaded object|Empty PDF|PDF exceeds)/.test(error.message)
        ? error.message : "Extraction or database operation failed; inspect configuration/connectivity and retry this item";
      report.summary.failed++;
      console.error(`#${item.masterItemNo}: ${record.error}`);
    }
    await saveReport();
  }
  await saveReport();
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed || report.summary.stale) process.exitCode = 1;
} catch {
  console.error("Backfill could not complete. Check database connectivity and report path. No seed or store operations were run.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
