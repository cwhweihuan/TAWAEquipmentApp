/**
 * Seed the database from data/seed/*.json:
 *   1. Upload downloaded PDFs to Supabase Storage + create Pdf rows
 *   2. Create Equipment rows (linked to their Pdf by driveId)
 *   3. Create the sample Stores + StoreItems (matched to catalog by dept item code)
 *
 * Run with:  npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ensurePdfBucket, uploadPdf } from "../lib/supabase";

const prisma = new PrismaClient();
const SEED = join(process.cwd(), "data", "seed");
const PDF_DIR = join(SEED, "pdfs");

type PdfSeed = {
  driveId: string;
  url: string;
  filename: string;
  downloaded: boolean;
  sizeBytes: number | null;
};
type EqSeed = {
  masterItemNo: number;
  description: string;
  departments: string[];
  departmentItems: Record<string, string>;
  pdfDriveId: string | null;
  [k: string]: unknown;
};
type StoreSeed = {
  name: string;
  number: string;
  location: string;
  items: Array<{
    deptItemNo: string | null;
    room: string | null;
    proposeNew: string | null;
    quantity: string | null;
    scheduleNo: string | null;
    description: string;
    [k: string]: unknown;
  }>;
};

function read<T>(f: string): T {
  return JSON.parse(readFileSync(join(SEED, f), "utf-8")) as T;
}

async function seedPdfs(pdfs: PdfSeed[]) {
  const idByDrive = new Map<string, string>();
  for (const p of pdfs) {
    let storagePath: string | null = null;
    if (p.downloaded) {
      const local = join(PDF_DIR, `${p.driveId}.pdf`);
      if (existsSync(local)) {
        try {
          storagePath = await uploadPdf(`${p.driveId}.pdf`, readFileSync(local));
        } catch (e) {
          console.warn(`  upload failed ${p.driveId}: ${(e as Error).message}`);
          storagePath = null;
        }
      }
    }
    const row = await prisma.pdf.upsert({
      where: { driveId: p.driveId },
      create: {
        driveId: p.driveId,
        filename: p.filename,
        driveUrl: p.url,
        storagePath,
        downloaded: p.downloaded,
        sizeBytes: p.sizeBytes ?? undefined,
      },
      update: { storagePath, downloaded: p.downloaded },
    });
    idByDrive.set(p.driveId, row.id);
  }
  console.log(`pdfs: ${pdfs.length} (${pdfs.filter((p) => p.downloaded).length} uploaded)`);
  return idByDrive;
}

async function seedEquipment(eq: EqSeed[], pdfIdByDrive: Map<string, string>) {
  // build a lookup from department item code (e.g. "BK#01") -> equipment id
  const codeToId = new Map<string, string>();
  for (const e of eq) {
    const pdfId = e.pdfDriveId ? pdfIdByDrive.get(e.pdfDriveId) ?? null : null;
    const row = await prisma.equipment.upsert({
      where: { masterItemNo: e.masterItemNo },
      create: {
        masterItemNo: e.masterItemNo,
        description: e.description,
        manufacturer: (e.manufacturer as string) ?? null,
        model: (e.model as string) ?? null,
        supplyBy: (e.supplyBy as string) ?? null,
        installBy: (e.installBy as string) ?? null,
        power: (e.power as string) ?? null,
        height: (e.height as string) ?? null,
        nema: (e.nema as string) ?? null,
        dataPhone: (e.dataPhone as string) ?? null,
        waterCold: (e.waterCold as string) ?? null,
        waterHot: (e.waterHot as string) ?? null,
        waterElev: (e.waterElev as string) ?? null,
        gasPipe: (e.gasPipe as string) ?? null,
        gasBtu: (e.gasBtu as string) ?? null,
        gasElev: (e.gasElev as string) ?? null,
        floorSink: (e.floorSink as string) ?? null,
        remarks: (e.remarks as string) ?? null,
        departments: e.departments,
        departmentItems: e.departmentItems,
        pdfId,
      },
      update: { pdfId },
    });
    for (const code of Object.values(e.departmentItems || {})) {
      for (const c of String(code).split("/")) codeToId.set(c.trim(), row.id);
    }
  }
  console.log(`equipment: ${eq.length}`);
  return codeToId;
}

async function seedStores(stores: StoreSeed[], codeToId: Map<string, string>) {
  for (const s of stores) {
    // refresh: delete existing store with same number to keep seed idempotent
    await prisma.store.deleteMany({ where: { number: s.number } });
    const store = await prisma.store.create({
      data: { number: s.number, name: s.name, location: s.location },
    });
    let pos = 0;
    let matched = 0;
    for (const it of s.items) {
      const codes = (it.deptItemNo || "").split(/[\n/]/).map((c) => c.trim());
      let equipmentId: string | null = null;
      for (const c of codes) {
        if (codeToId.has(c)) {
          equipmentId = codeToId.get(c)!;
          break;
        }
      }
      if (equipmentId) matched++;
      await prisma.storeItem.create({
        data: {
          storeId: store.id,
          equipmentId,
          description: equipmentId ? null : it.description,
          quantity: it.quantity ? parseFloat(it.quantity) || 1 : 1,
          room: it.room ?? null,
          proposeNew: it.proposeNew ?? null,
          scheduleNo: it.scheduleNo ?? null,
          position: pos++,
        },
      });
    }
    console.log(`store ${s.name}: ${s.items.length} items (${matched} matched to catalog)`);
  }
}

async function main() {
  await ensurePdfBucket();
  const pdfIdByDrive = await seedPdfs(read<PdfSeed[]>("pdfs.json"));
  const codeToId = await seedEquipment(read<EqSeed[]>("equipment.json"), pdfIdByDrive);
  await seedStores(read<StoreSeed[]>("stores.json"), codeToId);
  console.log("✓ seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
