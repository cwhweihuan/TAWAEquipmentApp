/** Plain, client-safe shape of an equipment item (serialized from Prisma). */
export type EquipmentDTO = {
  id: string;
  createdAt: string;
  masterItemNo: number;
  description: string;
  manufacturer: string | null;
  model: string | null;
  supplyBy: string | null;
  installBy: string | null;
  dimension: string | null;
  specUrl: string | null;
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
  pdfFilename: string | null;
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
  remarks: string | null;
  hasStoreRemarks?: boolean;
  quantity: number;
  rooms: string[];
  proposeNew: string | null;
  scheduleNo: string | null;
  drawingPage: string | null;
  customGroup: string | null;
  position: number;
  departments: string[];
  pdfFilename: string | null;
  pdfUrl: string | null;
  pdfDownloaded: boolean;
};

/** A subtenant slot in a store buildout — editable number + name. */
export type Subtenant = {
  no: string;
  name: string;
};

export type StoreEquipmentGrouping = "none" | "room" | "drawingPage" | "custom";

/** Client-safe shape of a store buildout (header + items). */
export type StoreView = {
  id: string;
  number: string;
  name: string;
  location: string | null;
  floorplanUrl: string | null;
  floorplanPath: string | null;
  floorplanName: string | null;
  subtenants: Subtenant[];
  rooms: string[];
  items: StoreItemDTO[];
  equipmentGrouping: StoreEquipmentGrouping;
};
