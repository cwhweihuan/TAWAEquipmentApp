ALTER TABLE "Store" ADD COLUMN "rooms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve existing room assignments as selectable project rooms.
UPDATE "Store" s SET "rooms" = ARRAY(
  SELECT DISTINCT i.room FROM "StoreItem" i
  WHERE i."storeId" = s.id AND i.room IS NOT NULL AND btrim(i.room) <> ''
  ORDER BY i.room
);

-- Requested Portland remodel areas; retain all existing rooms.
UPDATE "Store" SET "rooms" = "rooms" || ARRAY(
  SELECT r FROM unnest(ARRAY['Hot Deli', 'Juice Bar', 'Share by Dept.']) r
  WHERE NOT r = ANY("rooms")
) WHERE number = '1695' AND name ILIKE '%PORTLAND%';
