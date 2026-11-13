-- Preserve all existing single-room assignments when enabling multiple rooms.
ALTER TABLE "StoreItem" ADD COLUMN "rooms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "StoreItem" SET "rooms" = ARRAY["room"] WHERE "room" IS NOT NULL AND "room" <> '';
