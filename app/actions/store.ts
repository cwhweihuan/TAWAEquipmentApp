"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePdfBucket, uploadPdf, deletePdf, pdfPublicUrl } from "@/lib/supabase";
import type { Subtenant } from "@/lib/types";

export async function createStore(fd: FormData) {
  const number = (fd.get("number") as string)?.trim() || "NEW";
  const location = (fd.get("location") as string)?.trim() || "";
  const name = location ? `#${number} ${location}` : `#${number}`;
  const store = await prisma.store.create({ data: { number, name, location } });
  revalidatePath("/stores");
  return store.id;
}

export async function renameStore(id: string, fd: FormData) {
  const number = (fd.get("number") as string)?.trim() || "NEW";
  const location = (fd.get("location") as string)?.trim() || "";
  const name = location ? `#${number} ${location}` : `#${number}`;
  await prisma.store.update({ where: { id }, data: { number, location, name } });
  revalidatePath(`/stores/${id}`);
  revalidatePath("/stores");
}

export async function deleteStore(id: string) {
  await prisma.store.delete({ where: { id } });
  revalidatePath("/stores");
}

/** Save the editable store header details: name, number, address, and subtenants. */
export async function updateStoreDetails(
  id: string,
  details: { name: string; number: string; location: string; subtenants: Subtenant[] }
) {
  const name = details.name.trim() || `#${details.number.trim() || "NEW"}`;
  const subtenants = details.subtenants
    .map((s) => ({ no: s.no.trim(), name: s.name.trim() }))
    .filter((s) => s.no || s.name);
  await prisma.store.update({
    where: { id },
    data: {
      name,
      number: details.number.trim() || "NEW",
      location: details.location.trim() || null,
      subtenants,
    },
  });
  revalidatePath(`/stores/${id}`);
  revalidatePath("/stores");
}

/** Upload (or replace) the store's floor-plan PDF. Returns its public URL + filename. */
export async function uploadFloorplan(storeId: string, fd: FormData) {
  const file = fd.get("floorplan") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");
  await ensurePdfBucket();

  // remove the previous floor-plan file, if any
  const prev = await prisma.store.findUnique({ where: { id: storeId } });
  if (prev?.floorplanPath) await deletePdf(prev.floorplanPath);

  const bytes = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `floorplans/${storeId}-${Date.now()}-${safe}`;
  await uploadPdf(path, bytes);
  await prisma.store.update({
    where: { id: storeId },
    data: { floorplanPath: path, floorplanName: file.name },
  });
  revalidatePath(`/stores/${storeId}`);
  return { url: pdfPublicUrl(path), name: file.name };
}

/** Remove the store's floor-plan PDF. */
export async function removeFloorplan(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (store?.floorplanPath) await deletePdf(store.floorplanPath);
  await prisma.store.update({
    where: { id: storeId },
    data: { floorplanPath: null, floorplanName: null },
  });
  revalidatePath(`/stores/${storeId}`);
}

/** Add a catalog item to a store (appended at the end). */
export async function addItemToStore(storeId: string, equipmentId: string) {
  const max = await prisma.storeItem.aggregate({
    where: { storeId },
    _max: { position: true },
  });
  const item = await prisma.storeItem.create({
    data: { storeId, equipmentId, position: (max._max.position ?? -1) + 1 },
  });
  revalidatePath(`/stores/${storeId}`);
  return item.id;
}

/** Add a custom (non-catalog) line item. */
export async function addCustomItem(storeId: string, description: string) {
  const max = await prisma.storeItem.aggregate({
    where: { storeId },
    _max: { position: true },
  });
  const item = await prisma.storeItem.create({
    data: {
      storeId,
      description: description.trim() || "Custom item",
      position: (max._max.position ?? -1) + 1,
    },
  });
  revalidatePath(`/stores/${storeId}`);
  return item.id;
}

export async function updateStoreItem(
  itemId: string,
  patch: { quantity?: number; room?: string | null; proposeNew?: string | null; scheduleNo?: string | null }
) {
  const item = await prisma.storeItem.update({ where: { id: itemId }, data: patch });
  revalidatePath(`/stores/${item.storeId}`);
}

export async function removeStoreItem(itemId: string) {
  const item = await prisma.storeItem.delete({ where: { id: itemId } });
  revalidatePath(`/stores/${item.storeId}`);
}

/** Persist a new ordering of items in a store. */
export async function reorderStoreItems(storeId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.storeItem.update({ where: { id }, data: { position: i } })
    )
  );
  revalidatePath(`/stores/${storeId}`);
}
