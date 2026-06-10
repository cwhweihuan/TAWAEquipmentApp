import { getStores } from "@/lib/data";
import { StoreList } from "@/components/stores/StoreList";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const stores = await getStores();
  return <StoreList stores={stores} />;
}
