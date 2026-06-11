-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "dimension" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "floorplanName" TEXT,
ADD COLUMN     "floorplanPath" TEXT,
ADD COLUMN     "subtenants" JSONB;
