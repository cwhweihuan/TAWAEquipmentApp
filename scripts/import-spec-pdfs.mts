/**
 * Import company spec-sheet PDFs (matched from the NAS cut-sheet library) into
 * Supabase Storage and link each one to its Equipment row — removing the
 * dependency on Google Drive links.
 *
 * Input:  data/seed/_match.json  ->  [{ itemNo, file, path }, ...]
 *   itemNo : Equipment.masterItemNo
 *   file   : human-readable original filename (shown in the UI)
 *   path   : absolute path to the source PDF on the NAS / disk
 *
 * What it does, per entry:
 *   1. upload the PDF bytes to the Storage bucket at `nas-<itemNo>.pdf`
 *   2. upsert a Pdf row (driveId="nas-<itemNo>", storagePath set, driveUrl=null)
 *   3. point Equipment.pdfId at that Pdf
 * Finally it nulls driveUrl on every Pdf that has a storagePath, so the app's
 * pdfUrlFor() never falls back to a Drive link for a hosted file.
 *
 * Run:  npx tsx scripts/import-spec-pdfs.mts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { ensurePdfBucket, uploadPdf } from "../lib/supabase";

const prisma = new PrismaClient();
const MATCH = join(process.cwd(), "data", "seed", "_match.json");

type Match = { itemNo: number; file: string; path: string };

async function main() {
  const matches: Match[] = JSON.parse(readFileSync(MATCH, "utf-8"));
  console.log(`import: ${matches.length} matched PDFs`);
  await ensurePdfBucket();

  let uploaded = 0,
    linked = 0,
    missingFile = 0,
    missingEq = 0;

  for (const m of matches) {
    if (!existsSync(m.path)) {
      console.warn(`  ! missing source file for #${m.itemNo}: ${m.path}`);
      missingFile++;
      continue;
    }
    const driveId = `nas-${m.itemNo}`;
    const storageName = `${driveId}.pdf`;
    const bytes = readFileSync(m.path);

    let storagePath: string | null = null;
    try {
      storagePath = await uploadPdf(storageName, bytes);
      uploaded++;
    } catch (e) {
      console.warn(`  ! upload failed #${m.itemNo}: ${(e as Error).message}`);
      continue;
    }

    const pdf = await prisma.pdf.upsert({
      where: { driveId },
      create: {
        driveId,
        filename: m.file,
        storagePath,
        driveUrl: null,
        downloaded: true,
        sizeBytes: statSync(m.path).size,
      },
      update: { filename: m.file, storagePath, driveUrl: null, downloaded: true },
    });

    const eq = await prisma.equipment.updateMany({
      where: { masterItemNo: m.itemNo },
      data: { pdfId: pdf.id },
    });
    if (eq.count === 0) {
      console.warn(`  ! no Equipment with masterItemNo=${m.itemNo}`);
      missingEq++;
    } else {
      linked++;
    }
  }

  // Kill Drive fallback for anything that is actually hosted in Storage.
  const cleared = await prisma.pdf.updateMany({
    where: { storagePath: { not: null }, driveUrl: { not: null } },
    data: { driveUrl: null },
  });

  // Report equipment that still has no hosted PDF (no Drive fallback left).
  const orphans = await prisma.equipment.findMany({
    where: { OR: [{ pdfId: null }, { pdf: { storagePath: null } }] },
    select: { masterItemNo: true, description: true },
    orderBy: { masterItemNo: "asc" },
  });

  console.log(
    `\n✓ uploaded=${uploaded} linked=${linked} | missingFile=${missingFile} missingEq=${missingEq}`,
  );
  console.log(`✓ cleared driveUrl on ${cleared.count} hosted Pdf rows (no more Drive fallback)`);
  console.log(`\nEquipment still WITHOUT a hosted PDF: ${orphans.length}`);
  for (const o of orphans) console.log(`  #${o.masterItemNo} ${o.description}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
