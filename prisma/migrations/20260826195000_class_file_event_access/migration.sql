-- AlterTable
ALTER TABLE "ClassFile" ADD COLUMN "eventId" INTEGER;

-- CreateIndex
CREATE INDEX "ClassFile_eventId_idx" ON "ClassFile"("eventId");

-- AddForeignKey
ALTER TABLE "ClassFile" ADD CONSTRAINT "ClassFile_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bind orphan class files to the nearest CLASS event; if none, nearest event of any type.
UPDATE "ClassFile" AS f
SET "eventId" = COALESCE(
  (
    SELECT e.id FROM "Event" e
    WHERE e.type = 'CLASS' AND e."startDate" <= f."uploadedAt"
    ORDER BY e."startDate" DESC
    LIMIT 1
  ),
  (
    SELECT e.id FROM "Event" e
    WHERE e.type = 'CLASS'
    ORDER BY e."startDate" ASC
    LIMIT 1
  ),
  (
    SELECT e.id FROM "Event" e
    WHERE e."startDate" <= f."uploadedAt"
    ORDER BY e."startDate" DESC
    LIMIT 1
  ),
  (
    SELECT e.id FROM "Event" e
    ORDER BY e."startDate" ASC
    LIMIT 1
  )
)
WHERE f."eventId" IS NULL;
