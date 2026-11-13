/** Apply workspace-reviewed PDF facts without calling an AI API. Default: preview only. */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { parseArgs } from "node:util";
import { SPEC_FIELDS, parseSpecExtraction, planSpecBackfill } from "../lib/equipment-specs.js";
import type { EquipmentDTO } from "../lib/types.js";

const { values } = parseArgs({ options: {
  reviewed: { type: "string" }, snapshot: { type: "string", default: "data/extractions/catalog-snapshot.json" },
  apply: { type: "boolean", default: false }, report: { type: "string" },
} });
if (!values.reviewed) throw new Error("Pass --reviewed path.json (default: preview; --apply writes empty fields)");
const snapshot = JSON.parse(await readFile(values.snapshot!, "utf8")) as { equipment: EquipmentDTO[] };
const input: unknown = JSON.parse(await readFile(values.reviewed, "utf8"));
if (!Array.isArray(input)) throw new Error("Reviewed file must contain an array");
const seen = new Set<string>();
// Validate the entire input before any writes; never accept arbitrary database fields.
const entries = input.map((raw: unknown) => {
  if (!raw || typeof raw !== "object") throw new Error("Invalid reviewed entry");
  const entry = raw as Record<string, unknown>;
  const item = snapshot.equipment.find(item => item.id === entry.equipmentId && item.masterItemNo === entry.itemNo);
  if (!item || seen.has(item.id) || !item.pdfUrl || item.pdfUrl !== entry.pdfUrl ||
      typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Unknown, duplicate or inconsistent PDF source");
  seen.add(item.id);
  const extraction = parseSpecExtraction(entry.extraction);
  return { item, extraction, source: { pdfUrl: entry.pdfUrl, sha256: entry.sha256 } };
});
const reportPath = values.report ?? `${values.reviewed}.result-${Date.now()}.json`;
const report = { mode: values.apply ? "apply" : "preview", startedAt: new Date().toISOString(), records: [] as Record<string, unknown>[] };
const saveReport = () => writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
await saveReport();
for (const file of [".env.local", ".env"]) if (existsSync(file)) loadEnvFile(file);
if (values.apply && !process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL; no data changed. Preview works without database or AI keys.");
  process.exit(1);
}
const prisma = values.apply ? new (await import("@prisma/client")).PrismaClient() : null;
const { pdfPublicUrl } = await import("../lib/supabase.js");
try {
  for (const { item, extraction, source } of entries) {
    const changes = planSpecBackfill(item, extraction);
    const record: Record<string, unknown> = { itemNo: item.masterItemNo, equipmentId: item.id, source, extraction,
      before: Object.fromEntries(SPEC_FIELDS.map(field => [field, item[field]])), changes };
    report.records.push(record);
    if (extraction.match !== "matched") record.status = "review";
    else if (!Object.keys(changes).length) record.status = "unchanged";
    else if (!prisma) record.status = "proposed";
    else {
      const current = await prisma.equipment.findUnique({ where: { id: item.id }, include: { pdf: true } });
      if (!current || current.masterItemNo !== item.masterItemNo || current.description !== item.description ||
          current.manufacturer !== item.manufacturer || current.model !== item.model ||
          pdfPublicUrl(current.pdf?.storagePath) !== source.pdfUrl ||
          SPEC_FIELDS.some(field => current[field] !== item[field])) {
        record.status = "stale";
        process.exitCode = 1;
      } else {
        record.status = "pending_write";
        record.updatedAtBefore = current.updatedAt.toISOString();
        await saveReport();
        const result = await prisma.equipment.updateMany({
          where: { id: current.id, updatedAt: current.updatedAt, pdfId: current.pdfId }, data: changes,
        });
        record.status = result.count === 1 ? "updated" : "stale";
        if (!result.count) process.exitCode = 1;
      }
    }
    await saveReport();
    console.log(JSON.stringify({ itemNo: item.masterItemNo, status: record.status, changes }));
  }
  console.log(`Report: ${reportPath}`);
} catch {
  console.error("Apply stopped; check database connectivity and the audit report (pending_write may need reconciliation).");
  process.exitCode = 1;
} finally { await prisma?.$disconnect(); }
