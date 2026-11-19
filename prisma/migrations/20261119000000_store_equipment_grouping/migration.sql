CREATE TYPE "StoreEquipmentGrouping" AS ENUM ('none', 'room', 'drawingPage', 'custom');

ALTER TABLE "Store"
  ADD COLUMN "equipmentGrouping" "StoreEquipmentGrouping" NOT NULL DEFAULT 'room';

ALTER TABLE "StoreItem"
  ADD COLUMN "drawingPage" TEXT,
  ADD COLUMN "customGroup" TEXT;
