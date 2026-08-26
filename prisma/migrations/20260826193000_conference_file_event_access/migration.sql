-- CreateIndex
CREATE INDEX "ConferenceFile_eventId_idx" ON "ConferenceFile"("eventId");

-- Bind orphan files to the conference whose start is the latest on or before upload;
-- if the file is older than every event, use the earliest conference.
UPDATE "ConferenceFile" AS f
SET "eventId" = COALESCE(
  (
    SELECT e.id FROM "Event" e
    WHERE e.type = 'CONFERENCE' AND e."startDate" <= f."uploadedAt"
    ORDER BY e."startDate" DESC
    LIMIT 1
  ),
  (
    SELECT e.id FROM "Event" e
    WHERE e.type = 'CONFERENCE'
    ORDER BY e."startDate" ASC
    LIMIT 1
  )
)
WHERE f."eventId" IS NULL;
