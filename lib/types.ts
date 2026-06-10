/** Plain, client-safe shape of an equipment item (serialized from Prisma). */
export type EquipmentDTO = {
  id: string;
  masterItemNo: number;
  description: string;
  manufacturer: string | null;
  model: string | null;
  supplyBy: string | null;
  installBy: string | null;
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
  quantity: number;
  room: string | null;
  proposeNew: string | null;
  scheduleNo: string | null;
  position: number;
  departments: string[];
  pdfUrl: string | null;
};
