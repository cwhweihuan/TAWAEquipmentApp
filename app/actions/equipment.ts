"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deletePdf, ensurePdfBucket } from "@/lib/supabase";
import { DEPARTMENTS } from "@/lib/utils";

const FIELDS = [
  "description",
  "manufacturer",
  "model",
  "supplyBy",
  "installBy",
  "dimension",
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
  return { data, departments };
}

/** Upload an optional PDF from the form, returning a new Pdf row id (or null). */
async function maybeUploadPdf(fd: FormData): Promise<string | null> {
  const file = fd.get("pdf") as File | null;
  if (!file || file.size === 0) return null;
  await ensurePdfBucket();
  const bytes = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `uploads/${Date.now()}-${safe}`;
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

export async function createEquipment(fd: FormData) {
  const { data, departments } = readFields(fd);
  if (!data.description) throw new Error("Description is required");

  const pdfId = await maybeUploadPdf(fd);
  const max = await prisma.equipment.aggregate({ _max: { masterItemNo: true } });
  const masterItemNo = (max._max.masterItemNo ?? 0) + 1;

  const eq = await prisma.equipment.create({
    data: {
      masterItemNo,
      description: data.description!,
      manufacturer: data.manufacturer,
      model: data.model,
      supplyBy: data.supplyBy,
      installBy: data.installBy,
      dimension: data.dimension,
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
  revalidatePath("/catalog");
  return eq.id;
}

export async function updateEquipment(id: string, fd: FormData) {
  const { data, departments } = readFields(fd);
  const pdfId = await maybeUploadPdf(fd);

  await prisma.equipment.update({
    where: { id },
    data: {
      ...data,
      departments,
      ...(pdfId ? { pdfId } : {}),
    },
  });
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
  const src = await prisma.equipment.findUnique({ where: { id } });
  if (!src) throw new Error("Original equipment not found");

  const max = await prisma.equipment.aggregate({ _max: { masterItemNo: true } });
  const eq = await prisma.equipment.create({
    data: {
      masterItemNo: (max._max.masterItemNo ?? 0) + 1,
      description: overrides.description?.trim() || `${src.description} (variant)`,
      manufacturer: src.manufacturer,
      model: src.model,
      supplyBy: src.supplyBy,
      installBy: src.installBy,
      dimension: overrides.dimension?.trim() || null,
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
  revalidatePath("/catalog");
  return eq.id;
}

export async function deleteEquipment(id: string) {
  const eq = await prisma.equipment.findUnique({ where: { id }, include: { pdf: true } });
  await prisma.equipment.delete({ where: { id } });
  // clean up an uploaded (non-seed) PDF if nothing else references it
  if (eq?.pdf?.storagePath?.startsWith("uploads/")) {
    const refs = await prisma.equipment.count({ where: { pdfId: eq.pdfId } });
    if (refs === 0) {
      await deletePdf(eq.pdf.storagePath);
      await prisma.pdf.delete({ where: { id: eq.pdf.id } });
    }
  }
  revalidatePath("/catalog");
}
