import { getEquipment, getDepartmentCounts, toEquipmentDTO } from "@/lib/data";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [rows, deptCounts] = await Promise.all([getEquipment(), getDepartmentCounts()]);
  const equipment = rows.map(toEquipmentDTO);
  return <CatalogBrowser equipment={equipment} deptCounts={deptCounts} />;
}
