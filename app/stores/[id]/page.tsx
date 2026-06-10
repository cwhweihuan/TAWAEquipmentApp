import { notFound } from "next/navigation";
import { getStore, getEquipment, toEquipmentDTO, toStoreView } from "@/lib/data";
import { StoreBuilder } from "@/components/stores/StoreBuilder";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [store, rows] = await Promise.all([getStore(id), getEquipment()]);
  if (!store) notFound();
  return <StoreBuilder store={toStoreView(store)} equipment={rows.map(toEquipmentDTO)} />;
}
