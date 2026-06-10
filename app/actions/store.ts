"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
