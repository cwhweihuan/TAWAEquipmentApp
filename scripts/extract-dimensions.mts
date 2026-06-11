/**
 * Local backfill: read overall dimensions out of equipment spec PDFs with
 * Gemini and write them to the database. Run from your machine (where
 * GEMINI_API_KEY is set in .env) — this is intentionally NOT exposed in the web
 * app. Whatever Gemini can't find is left blank for manual entry on the site.
 *
 *   npm run extract:dimensions            # fill only items missing a dimension
 *   npm run extract:dimensions -- --all   # re-scan every item with a PDF (overwrite)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { pdfPublicUrl } from "../lib/supabase";
import { geminiEnabled, geminiDimensionFromPdf } from "../lib/gemini";

const overwrite = process.argv.includes("--all");
const prisma = new PrismaClient();

if (!geminiEnabled()) {
  console.error("✗ GEMINI_API_KEY is not set in .env — aborting.");
  process.exit(1);
}

const items = await prisma.equipment.findMany({
  where: {
    pdf: { is: { storagePath: { not: null } } },
    ...(overwrite ? {} : { dimension: null }),
  },
  include: { pdf: true },
  orderBy: { masterItemNo: "asc" },
});

console.log(`Scanning ${items.length} equipment PDF${items.length === 1 ? "" : "s"} with Gemini…\n`);

let filled = 0;
let none = 0;
let failed = 0;
for (const e of items) {
  const label = `#${e.masterItemNo} ${e.description.slice(0, 40)}`;
  try {
    const res = await fetch(pdfPublicUrl(e.pdf!.storagePath!));
    if (!res.ok) {
      failed++;
      console.log(`  ✗ ${label} — fetch ${res.status}`);
      continue;
    }
    const dim = await geminiDimensionFromPdf(new Uint8Array(await res.arrayBuffer()));
    if (dim) {
      await prisma.equipment.update({ where: { id: e.id }, data: { dimension: dim } });
      filled++;
      console.log(`  ✓ ${label} → ${dim}`);
    } else {
      none++;
      console.log(`  · ${label} — no size found (leave for manual entry)`);
    }
  } catch (err) {
    failed++;
    console.log(`  ✗ ${label} — ${(err as Error).message}`);
  }
}

console.log(`\nDone. Filled ${filled}, no-size ${none}, failed ${failed}.`);
await prisma.$disconnect();
