import { notFound } from "next/navigation";
import { getEquipmentById, toEquipmentDTO } from "@/lib/data";
import { EquipmentForm } from "@/components/catalog/EquipmentForm";

export const dynamic = "force-dynamic";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getEquipmentById(id);
  if (!row) notFound();
  return <EquipmentForm item={toEquipmentDTO(row)} />;
}
