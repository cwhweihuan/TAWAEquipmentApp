import { prisma } from "./prisma";
import { pdfPublicUrl } from "./supabase";
import type { Prisma } from "@prisma/client";
import type { EquipmentDTO, StoreItemDTO, StoreView, Subtenant } from "./types";

export type EquipmentWithPdf = Prisma.EquipmentGetPayload<{ include: { pdf: true } }>;

/** Convert a Prisma equipment (+pdf) row into a client-safe DTO with a resolved PDF url. */
export function toEquipmentDTO(e: EquipmentWithPdf): EquipmentDTO {
  return {
    id: e.id,
    masterItemNo: e.masterItemNo,
    description: e.description,
    manufacturer: e.manufacturer,
    model: e.model,
    supplyBy: e.supplyBy,
    installBy: e.installBy,
    dimension: e.dimension,
    power: e.power,
    height: e.height,
    nema: e.nema,
    dataPhone: e.dataPhone,
    waterCold: e.waterCold,
    waterHot: e.waterHot,
    waterElev: e.waterElev,
    gasPipe: e.gasPipe,
    gasBtu: e.gasBtu,
    gasElev: e.gasElev,
    floorSink: e.floorSink,
    remarks: e.remarks,
    departments: e.departments,
    departmentItems: (e.departmentItems as Record<string, string>) ?? {},
    pdfUrl: pdfUrlFor(e.pdf),
    pdfDownloaded: e.pdf?.downloaded ?? false,
  };
}

/** Resolve the best viewable URL for an equipment's spec PDF (stored file preferred). */
export function pdfUrlFor(pdf: { storagePath: string | null; driveUrl: string | null } | null) {
  if (!pdf) return null;
  if (pdf.storagePath) return pdfPublicUrl(pdf.storagePath);
  return pdf.driveUrl ?? null;
}

export async function getEquipment(opts: {
  q?: string;
  departments?: string[];
  hasPdf?: boolean;
} = {}): Promise<EquipmentWithPdf[]> {
  const where: Prisma.EquipmentWhereInput = { AND: [] };
  const and = where.AND as Prisma.EquipmentWhereInput[];

  if (opts.q?.trim()) {
    const q = opts.q.trim();
    and.push({
      OR: [
        { description: { contains: q, mode: "insensitive" } },
        { manufacturer: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (opts.departments?.length) {
    and.push({ departments: { hasSome: opts.departments } });
  }
  if (opts.hasPdf) {
    and.push({ pdfId: { not: null } });
  }

  return prisma.equipment.findMany({
    where,
    include: { pdf: true },
    orderBy: { masterItemNo: "asc" },
  });
}

export async function getEquipmentById(id: string) {
  return prisma.equipment.findUnique({ where: { id }, include: { pdf: true } });
}

/** Count of equipment per department, for filter badges. */
export async function getDepartmentCounts(): Promise<Record<string, number>> {
  const all = await prisma.equipment.findMany({ select: { departments: true } });
  const counts: Record<string, number> = {};
  for (const e of all) for (const d of e.departments) counts[d] = (counts[d] ?? 0) + 1;
  return counts;
}

export async function getCatalogStats() {
  const [total, withPdf, stores] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.count({ where: { pdfId: { not: null } } }),
    prisma.store.count(),
  ]);
  return { total, withPdf, stores };
}

export async function getStores() {
  return prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function getStore(id: string) {
  return prisma.store.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { equipment: { include: { pdf: true } } },
      },
    },
  });
}

type StoreWithItems = NonNullable<Awaited<ReturnType<typeof getStore>>>;

export function toStoreItemDTO(it: StoreWithItems["items"][number]): StoreItemDTO {
  const eq = it.equipment;
  return {
    id: it.id,
    equipmentId: it.equipmentId,
    description: eq?.description ?? it.description ?? "Custom item",
    manufacturer: eq?.manufacturer ?? null,
    model: eq?.model ?? null,
    dimension: eq?.dimension ?? null,
    quantity: it.quantity,
    room: it.room,
    proposeNew: it.proposeNew,
    scheduleNo: it.scheduleNo,
    position: it.position,
    departments: eq?.departments ?? [],
    pdfUrl: eq ? pdfUrlFor(eq.pdf) : null,
    pdfDownloaded: eq?.pdf?.downloaded ?? false,
  };
}

/** Parse the loosely-typed Json subtenants column into a clean, ordered array. */
export function parseSubtenants(raw: unknown): Subtenant[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({ no: String(s.no ?? ""), name: String(s.name ?? "") }));
}

export function toStoreView(store: StoreWithItems): StoreView {
  return {
    id: store.id,
    number: store.number,
    name: store.name,
    location: store.location,
    floorplanUrl: store.floorplanPath ? pdfPublicUrl(store.floorplanPath) : null,
    floorplanName: store.floorplanName,
    subtenants: parseSubtenants(store.subtenants),
    items: store.items.map(toStoreItemDTO),
  };
}
