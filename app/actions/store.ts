"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePdfBucket, createSignedUploadUrl, deletePdf, pdfPublicUrl } from "@/lib/supabase";
import { STORE_STATUS_OPTIONS } from "@/lib/utils";
import type { Subtenant } from "@/lib/types";

class RoomValidationError extends Error {}

/** Rename rooms and their assigned rows together; reject stale room edits. */
export async function saveStoreRooms(storeId: string, expected: string[], entries: { original: string | null; name: string }[]) {
  const names = entries.map((entry) => entry.name.trim());
  if (names.some((name) => !name || name.length > 120) || new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    return { error: "Room names must be unique, non-empty, and at most 120 characters." };
  }
  const originals = entries.flatMap((entry) => entry.original === null ? [] : [entry.original]);
  if (new Set(originals).size !== originals.length || originals.some((name) => !expected.includes(name))) return { error: "Invalid room changes." };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.store.updateMany({ where: { id: storeId, rooms: { equals: expected } }, data: { rooms: names } });
      if (updated.count !== 1) throw new RoomValidationError("Rooms changed. Reload the store before saving.");
      const assigned = await tx.storeItem.findMany({ where: { storeId, rooms: { isEmpty: false } }, select: { id: true, rooms: true } });
      const mapping = new Map(entries.filter((entry) => entry.original !== null).map((entry) => [entry.original!, entry.name.trim()]));
      for (const item of assigned) {
        const next = item.rooms.map((room) => {
          const renamed = mapping.get(room);
          if (renamed === undefined) throw new RoomValidationError(`Room "${room}" is in use. Move its equipment before removing it.`);
          return renamed;
        });
        if (next.some((room, index) => room !== item.rooms[index])) await tx.storeItem.update({ where: { id: item.id }, data: { rooms: next } });
      }
      return names;
    });
    revalidatePath(`/stores/${storeId}`);
    return { rooms: result };
  } catch (error) {
    if (error instanceof RoomValidationError) return { error: error.message };
    throw error;
  }
}

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

/** Upload bytes directly from the browser, outside Server Action body limits. */
export async function prepareFloorplanUpload(storeId: string, filename: string) {
  await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { id: true } });
  if (!filename.toLowerCase().endsWith(".pdf")) throw new Error("Floor plan must be a PDF");
  await ensurePdfBucket();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `floorplans/${storeId}/${crypto.randomUUID()}-${safe}`;
  return { path, uploadUrl: await createSignedUploadUrl(path) };
}

/** Link a successfully uploaded PDF; preserve the previous plan if anything fails. */
export async function saveFloorplanUpload(storeId: string, file: { path: string; name: string }, expectedPath: string | null) {
  if (!file.path.startsWith(`floorplans/${storeId}/`) || file.path.includes("..") || !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Invalid floor plan path");
  const url = pdfPublicUrl(file.path);
  if (!url) throw new Error("Storage is unavailable");
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) throw new Error("Uploaded PDF could not be verified");
  const saved = await prisma.store.updateMany({
    where: { id: storeId, floorplanPath: expectedPath },
    data: { floorplanPath: file.path, floorplanName: file.name },
  });
  if (saved.count !== 1) throw new Error("Floor plan changed. Reload the store before uploading again.");
  revalidatePath(`/stores/${storeId}`);
  return { url, name: file.name, path: file.path };
}

/** Remove the store's floor-plan link before cleaning up its file. */
export async function removeFloorplan(storeId: string) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const removed = await prisma.store.updateMany({
    where: { id: storeId, floorplanPath: store.floorplanPath },
    data: { floorplanPath: null, floorplanName: null },
  });
  if (removed.count !== 1) throw new Error("Floor plan changed. Reload before removing it.");
  if (store.floorplanPath) await deletePdf(store.floorplanPath);
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

export async function replaceStoreItemEquipment(
  storeId: string,
  itemId: string,
  expectedEquipmentId: string | null,
  equipmentId: string,
) {
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { id: true } });
  if (!equipment) return { error: "This equipment is no longer in the catalog." };

  const result = await prisma.storeItem.updateMany({
    where: { id: itemId, storeId, equipmentId: expectedEquipmentId },
    data: {
      equipmentId,
      description: null,
      manufacturer: null,
      model: null,
      dimension: null,
      remarks: null,
    },
  });
  if (result.count !== 1) return { error: "This row changed. Reload the schedule before replacing it." };

  revalidatePath(`/stores/${storeId}`);
  return { success: true };
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

/** A zero-quantity schedule placeholder, detached from the equipment catalog. */
export async function addOmittedItem(storeId: string) {
  const max = await prisma.storeItem.aggregate({ where: { storeId }, _max: { position: true } });
  const item = await prisma.storeItem.create({
    data: { storeId, description: "Omitted", quantity: 0, position: (max._max.position ?? -1) + 1 },
  });
  revalidatePath(`/stores/${storeId}`);
  return item.id;
}

export async function updateStoreItem(
  itemId: string,
  patch: { quantity?: number; rooms?: string[]; proposeNew?: string | null; scheduleNo?: string | null }
) {
  if (patch.quantity !== undefined && (!Number.isFinite(patch.quantity) || patch.quantity < 0)) throw new Error("Quantity must be zero or greater.");
  const item = await prisma.$transaction(async (tx) => {
    const existing = await tx.storeItem.findUniqueOrThrow({ where: { id: itemId }, select: { storeId: true } });
    if (patch.rooms !== undefined) {
      // Serialize room assignment against project room renames/removals.
      await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${existing.storeId} FOR UPDATE`;
      const store = await tx.store.findUniqueOrThrow({ where: { id: existing.storeId }, select: { rooms: true } });
      if (!Array.isArray(patch.rooms) || patch.rooms.some((room) => typeof room !== "string" || !store.rooms.includes(room))) throw new Error("Choose rooms created for this store.");
      patch = { ...patch, rooms: [...new Set(patch.rooms)] };
    }
    return tx.storeItem.update({ where: { id: itemId }, data: patch });
  });
  revalidatePath(`/stores/${item.storeId}`);
}

export type StoreItemPlacementPatch = { rooms?: string[]; proposeNew?: string | null };

export async function updateStoreItemPlacements(storeId: string, ids: string[], patch: StoreItemPlacementPatch) {
  const itemIds = [...new Set(ids)];
  if (!itemIds.length || (patch.rooms === undefined && patch.proposeNew === undefined)) {
    return { error: "Select equipment and choose a change." };
  }
  if (patch.proposeNew != null && !STORE_STATUS_OPTIONS.some((status) => status === patch.proposeNew)) {
    return { error: "Choose a valid status." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { rooms, proposeNew } = patch;
      if (rooms !== undefined) {
        await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${storeId} FOR UPDATE`;
        const store = await tx.store.findUnique({ where: { id: storeId }, select: { rooms: true } });
        if (!store || !Array.isArray(rooms) || rooms.some((room) => !store.rooms.includes(room))) {
          throw new RoomValidationError("Choose rooms created for this store.");
        }
      }
      const { count } = await tx.storeItem.updateMany({
        where: { storeId, id: { in: itemIds } },
        data: { rooms: rooms === undefined ? undefined : [...new Set(rooms)], proposeNew },
      });
      if (count !== itemIds.length) {
        throw new RoomValidationError("Some selected equipment is no longer in this store. Reload and try again.");
      }
    });
    revalidatePath(`/stores/${storeId}`);
    return { count: itemIds.length };
  } catch (error) {
    if (error instanceof RoomValidationError) return { error: error.message };
    throw error;
  }
}

/** Fields a custom (non-catalog) line item carries on its own row. */
export type CustomItemFields = {
  description: string;
  manufacturer: string | null;
  model: string | null;
  dimension: string | null;
  remarks: string | null;
};

/**
 * Edit a custom line item's own description / manufacturer / model / dimension.
 * Catalog-linked rows get these from the shared Equipment record instead, so
 * this refuses to touch them (edit the family via EquipmentEditDrawer).
 */
export async function updateCustomItem(itemId: string, fields: CustomItemFields) {
  const existing = await prisma.storeItem.findUnique({ where: { id: itemId } });
  if (!existing) throw new Error("Item not found");
  if (existing.equipmentId) throw new Error("Catalog-linked items are edited via the equipment record");
  const clean = (v: string | null) => {
    const t = v?.trim();
    return t ? t : null;
  };
  const item = await prisma.storeItem.update({
    where: { id: itemId },
    data: {
      description: fields.description.trim() || "Custom item",
      manufacturer: clean(fields.manufacturer),
      model: clean(fields.model),
      dimension: clean(fields.dimension),
      remarks: clean(fields.remarks),
    },
  });
  revalidatePath(`/stores/${item.storeId}`);
}

/**
 * Duplicate a store row as a detached custom item inserted right after it.
 * Copies the visible fields (description / manufacturer / model / dimension) plus
 * quantity / room / status, so a catalog row can be turned into an editable
 * one-off for this store. Returns the new row id.
 */
export async function duplicateAsCustom(itemId: string) {
  const src = await prisma.storeItem.findUnique({
    where: { id: itemId },
    include: { equipment: true },
  });
  if (!src) throw new Error("Item not found");
  const eq = src.equipment;
  const [, item] = await prisma.$transaction([
    // make room right after the source row
    prisma.storeItem.updateMany({
      where: { storeId: src.storeId, position: { gt: src.position } },
      data: { position: { increment: 1 } },
    }),
    prisma.storeItem.create({
      data: {
        storeId: src.storeId,
        equipmentId: null,
        description: eq?.description ?? src.description ?? "Custom item",
        manufacturer: eq?.manufacturer ?? src.manufacturer ?? null,
        model: eq?.model ?? src.model ?? null,
        dimension: eq?.dimension ?? src.dimension ?? null,
        remarks: eq?.remarks ?? src.remarks ?? null,
        quantity: src.quantity,
        rooms: src.rooms,
        proposeNew: src.proposeNew,
        scheduleNo: src.scheduleNo,
        position: src.position + 1,
      },
    }),
  ]);
  revalidatePath(`/stores/${src.storeId}`);
  return item.id;
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
