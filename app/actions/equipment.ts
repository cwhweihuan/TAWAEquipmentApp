"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deletePdf, ensurePdfBucket, createSignedUploadUrl } from "@/lib/supabase";
import { DEPARTMENTS, isOmittedStoreItem, splitStoreSpecSource } from "@/lib/utils";

const FIELDS = [
  "description",
  "manufacturer",
  "model",
  "supplyBy",
  "installBy",
  "dimension",
  "specUrl",
  "power",
  "height",
  "nema",
  "dataPhone",
  "waterCold",
  "waterHot",
  "waterElev",
  "gasPipe",
  "gasBtu",
  "gasElev",
  "floorSink",
  "remarks",
] as const;

function readFields(fd: FormData) {
  const data: Record<string, string | null> = {};
  for (const f of FIELDS) {
    const v = (fd.get(f) as string | null)?.trim();
    data[f] = v ? v : null;
  }
  const departments = DEPARTMENTS.filter((d) => fd.get(`dept:${d}`) === "on");
  if (data.specUrl) {
    let url: URL;
    try {
      url = new URL(data.specUrl);
    } catch {
      throw new Error("Official product URL must be a valid URL");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Official product URL must use HTTP or HTTPS");
    }
  }
  return { data, departments };
}

function specStoragePath(filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${Date.now()}-${safe}`;
}

/**
 * Step 1 of a spec-sheet upload: hand the browser a signed URL so it can PUT
 * the PDF directly into Storage. The form then submits only the resulting
 * storage path (see `maybeUploadPdf`), so the server-action body stays tiny.
 */
export async function prepareSpecUpload(filename: string) {
  if (!filename.toLowerCase().endsWith(".pdf")) throw new Error("Spec sheet must be a PDF");
  await ensurePdfBucket();
  const path = specStoragePath(filename);
  const uploadUrl = await createSignedUploadUrl(path);
  return { path, uploadUrl };
}

/**
 * Record an optional spec PDF from the form, returning a new Pdf row id (or null).
 * Preferred path: the browser already uploaded the file (pdfPath/pdfName/pdfSize).
 * Fallback: a raw `pdf` File in the body — only works for files under the
 * server-action body limit (1MB default), kept for small files / older clients.
 */
async function maybeUploadPdf(fd: FormData): Promise<string | null> {
  const pdfPath = fd.get("pdfPath");
  if (typeof pdfPath === "string" && pdfPath) {
    if (!pdfPath.startsWith("uploads/") || pdfPath.includes("..")) throw new Error("Invalid spec path");
    const name = fd.get("pdfName");
    const size = Number(fd.get("pdfSize"));
    const pdf = await prisma.pdf.create({
      data: {
        filename: typeof name === "string" && name ? name : pdfPath.split("/").pop()!,
        storagePath: pdfPath,
        downloaded: true,
        sizeBytes: Number.isFinite(size) && size > 0 ? size : null,
      },
    });
    return pdf.id;
  }

  const file = fd.get("pdf") as File | null;
  if (!file || file.size === 0) return null;
  await ensurePdfBucket();
  const bytes = Buffer.from(await file.arrayBuffer());
  const path = specStoragePath(file.name);
  await uploadPdf(path, bytes);
  const pdf = await prisma.pdf.create({
    data: {
      filename: file.name,
      storagePath: path,
      downloaded: true,
      sizeBytes: file.size,
    },
  });
  return pdf.id;
}

/** Serialize catalog number changes across create, duplicate, reorder and delete. */
function withCatalogNumbering<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(54943, 1)`;
    return work(tx);
  });
}

export async function createEquipment(fd: FormData) {
  const { data, departments } = readFields(fd);
  if (!data.description) throw new Error("Description is required");

  const pdfId = await maybeUploadPdf(fd);
  const eq = await withCatalogNumbering(async (tx) => {
    const max = await tx.equipment.aggregate({ _max: { masterItemNo: true } });
    const masterItemNo = (max._max.masterItemNo ?? 0) + 1;

    return tx.equipment.create({
      data: {
        masterItemNo,
        description: data.description!,
        manufacturer: data.manufacturer,
        model: data.model,
        supplyBy: data.supplyBy,
        installBy: data.installBy,
        dimension: data.dimension,
        specUrl: data.specUrl,
        power: data.power,
        height: data.height,
        nema: data.nema,
        dataPhone: data.dataPhone,
        waterCold: data.waterCold,
        waterHot: data.waterHot,
        waterElev: data.waterElev,
        gasPipe: data.gasPipe,
        gasBtu: data.gasBtu,
        gasElev: data.gasElev,
        floorSink: data.floorSink,
        remarks: data.remarks,
        departments,
        pdfId,
      },
    });
  });
  revalidatePath("/catalog");
  return eq.id;
}

export async function convertCustomItemToEquipment(storeId: string, itemId: string) {
  const result = await withCatalogNumbering(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StoreItem" WHERE id = ${itemId} AND "storeId" = ${storeId} FOR UPDATE`;
    const item = await tx.storeItem.findUnique({ where: { id: itemId, storeId } });
    if (!item) return { error: "This store item is no longer available." };
    if (item.equipmentId) return { equipmentId: item.equipmentId, remarks: item.remarks };
    if (isOmittedStoreItem(item)) return { error: "An omitted placeholder cannot be added to the catalog." };

    const { remarks, specSource } = splitStoreSpecSource(item.remarks);
    const notes = remarks?.trim() || null;
    const max = await tx.equipment.aggregate({ _max: { masterItemNo: true } });
    const equipment = await tx.equipment.create({
      data: {
        masterItemNo: (max._max.masterItemNo ?? 0) + 1,
        description: item.description ?? "Custom item",
        manufacturer: item.manufacturer,
        model: item.model,
        dimension: item.dimension,
        specUrl: specSource,
        remarks: notes,
        departments: [],
      },
    });
    await tx.storeItem.update({
      where: { id: item.id },
      data: { equipmentId: equipment.id, remarks: notes },
    });
    return { equipmentId: equipment.id, remarks: notes };
  });
  if (result.equipmentId) {
    revalidatePath("/catalog");
    revalidatePath(`/stores/${storeId}`);
  }
  return result;
}

export async function updateEquipment(id: string, fd: FormData, storeRow?: {
  id: string;
  storeId: string;
  initialRemarks: string;
}) {
  const { data, departments } = readFields(fd);
  const pdfId = await maybeUploadPdf(fd);
  const remarks = data.remarks ?? "";
  if (storeRow) delete data.remarks;
  const fields = { ...data, departments, ...(pdfId ? { pdfId } : {}) };

  if (storeRow) {
    await prisma.$transaction(async (tx) => {
      const where = { id: storeRow.id, storeId: storeRow.storeId, equipmentId: id };
      if (remarks === storeRow.initialRemarks.trim()) {
        await tx.storeItem.findFirstOrThrow({ where, select: { id: true } });
      } else {
        const saved = await tx.storeItem.updateMany({ where, data: { remarks } });
        if (saved.count !== 1) throw new Error("This row changed. Reopen it before saving.");
      }
      await tx.equipment.update({ where: { id }, data: fields });
    });
    revalidatePath(`/stores/${storeRow.storeId}`);
  } else {
    await prisma.equipment.update({ where: { id }, data: fields });
  }
  revalidatePath("/catalog");
}

/** Quick inline save of just the dimension field (used from the catalog drawer). */
export async function updateEquipmentDimension(id: string, dimension: string) {
  await prisma.equipment.update({
    where: { id },
    data: { dimension: dimension.trim() || null },
  });
  revalidatePath("/catalog");
}

/**
 * Duplicate an equipment item as a variant — like a Revit family type. The copy
 * shares the original's spec PDF (same pdfId) but gets its own name + dimension.
 */
export async function duplicateEquipment(
  id: string,
  overrides: { description?: string; dimension?: string }
): Promise<string> {
  const eq = await withCatalogNumbering(async (tx) => {
    const src = await tx.equipment.findUnique({ where: { id } });
    if (!src) throw new Error("Original equipment not found");

    const max = await tx.equipment.aggregate({ _max: { masterItemNo: true } });
    return tx.equipment.create({
      data: {
        masterItemNo: (max._max.masterItemNo ?? 0) + 1,
        description: overrides.description?.trim() || `${src.description} (variant)`,
        manufacturer: src.manufacturer,
        model: src.model,
        supplyBy: src.supplyBy,
        installBy: src.installBy,
        dimension: overrides.dimension?.trim() || null,
        specUrl: src.specUrl,
        power: src.power,
        height: src.height,
        nema: src.nema,
        dataPhone: src.dataPhone,
        waterCold: src.waterCold,
        waterHot: src.waterHot,
        waterElev: src.waterElev,
        gasPipe: src.gasPipe,
        gasBtu: src.gasBtu,
        gasElev: src.gasElev,
        floorSink: src.floorSink,
        remarks: src.remarks,
        departments: src.departments,
        ...(src.departmentItems != null
          ? { departmentItems: src.departmentItems as Prisma.InputJsonValue }
          : {}),
        pdfId: src.pdfId, // share the spec sheet with the original
      },
    });
  });
  revalidatePath("/catalog");
  return eq.id;
}

export async function reorderCatalogEquipment(
  expected: { id: string; masterItemNo: number }[],
  movedId: string,
  targetId: string,
) {
  const saved = await withCatalogNumbering(async (tx) => {
    const ids = expected.map((item) => item.id);
    const current = await tx.equipment.findMany({
      where: { id: { in: ids } },
      orderBy: { masterItemNo: "asc" },
      select: { id: true, masterItemNo: true },
    });
    const unchanged = current.length === expected.length && current.every(
      (item, index) => item.id === expected[index].id && item.masterItemNo === expected[index].masterItemNo,
    );
    const from = ids.indexOf(movedId);
    const to = ids.indexOf(targetId);
    if (!unchanged || from < 0 || to < 0) return false;
    if (from === to) return true;

    ids.splice(from, 1);
    ids.splice(to, 0, movedId);
    const reordered = ids.map((id, index) => ({ id, number: current[index].masterItemNo }));
    // Release the occupied numbers before assigning them to different cards.
    await tx.$executeRaw`
      UPDATE "Equipment" SET "masterItemNo" = -"masterItemNo"
      WHERE id IN (${Prisma.join(ids)})
    `;
    await tx.$executeRaw`
      UPDATE "Equipment" AS equipment SET "masterItemNo" = ordered.number
      FROM jsonb_to_recordset(${JSON.stringify(reordered)}::jsonb) AS ordered(id text, number integer)
      WHERE equipment.id = ordered.id
    `;
    return true;
  });
  if (saved) revalidatePath("/catalog");
  return saved;
}

export async function deleteEquipment(id: string) {
  const eq = await withCatalogNumbering(async (tx) => {
    const deleted = await tx.equipment.delete({ where: { id }, include: { pdf: true } });
    // Move numbers out of the way before assigning a continuous sequence in the same order.
    await tx.$executeRaw`UPDATE "Equipment" SET "masterItemNo" = -"masterItemNo"`;
    await tx.$executeRaw`
      WITH numbered AS (
        SELECT id, row_number() OVER (ORDER BY "masterItemNo" DESC)::integer AS number
        FROM "Equipment"
      )
      UPDATE "Equipment" AS equipment SET "masterItemNo" = numbered.number
      FROM numbered WHERE equipment.id = numbered.id
    `;
    return deleted;
  });
  // clean up an uploaded (non-seed) PDF if nothing else references it
  if (eq.pdf?.storagePath?.startsWith("uploads/")) {
    const refs = await prisma.equipment.count({ where: { pdfId: eq.pdfId } });
    if (refs === 0) {
      await deletePdf(eq.pdf.storagePath);
      await prisma.pdf.delete({ where: { id: eq.pdf.id } });
    }
  }
  revalidatePath("/catalog");
}
