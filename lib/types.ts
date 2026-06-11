/** Plain, client-safe shape of an equipment item (serialized from Prisma). */
export type EquipmentDTO = {
  id: string;
  masterItemNo: number;
  description: string;
  manufacturer: string | null;
  model: string | null;
  supplyBy: string | null;
  installBy: string | null;
  dimension: string | null;
  power: string | null;
  height: string | null;
  nema: string | null;
  dataPhone: string | null;
  waterCold: string | null;
  waterHot: string | null;
  waterElev: string | null;
  gasPipe: string | null;
  gasBtu: string | null;
  gasElev: string | null;
  floorSink: string | null;
  remarks: string | null;
  departments: string[];
  departmentItems: Record<string, string>;
  pdfUrl: string | null;
  pdfDownloaded: boolean;
};

export type StoreItemDTO = {
  id: string;
  equipmentId: string | null;
  description: string;
  manufacturer: string | null;
  model: string | null;
  dimension: string | null;
  quantity: number;
  room: string | null;
  proposeNew: string | null;
  scheduleNo: string | null;
  position: number;
  departments: string[];
  pdfUrl: string | null;
  pdfDownloaded: boolean;
};

/** A subtenant slot in a store buildout — editable number + name. */
export type Subtenant = {
  no: string;
  name: string;
};

/** Client-safe shape of a store buildout (header + items). */
export type StoreView = {
  id: string;
  number: string;
  name: string;
  location: string | null;
  floorplanUrl: string | null;
  floorplanName: string | null;
  subtenants: Subtenant[];
  items: StoreItemDTO[];
};
