-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "masterItemNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "supplyBy" TEXT,
    "installBy" TEXT,
    "power" TEXT,
    "height" TEXT,
    "nema" TEXT,
    "dataPhone" TEXT,
    "waterCold" TEXT,
    "waterHot" TEXT,
    "waterElev" TEXT,
    "gasPipe" TEXT,
    "gasBtu" TEXT,
    "gasElev" TEXT,
    "floorSink" TEXT,
    "remarks" TEXT,
    "departments" TEXT[],
    "departmentItems" JSONB,
    "pdfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pdf" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT,
    "driveUrl" TEXT,
    "driveId" TEXT,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "room" TEXT,
    "proposeNew" TEXT,
    "scheduleNo" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_masterItemNo_key" ON "Equipment"("masterItemNo");

-- CreateIndex
CREATE INDEX "Equipment_masterItemNo_idx" ON "Equipment"("masterItemNo");

-- CreateIndex
CREATE UNIQUE INDEX "Pdf_driveId_key" ON "Pdf"("driveId");

-- CreateIndex
CREATE INDEX "StoreItem_storeId_idx" ON "StoreItem"("storeId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "Pdf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
