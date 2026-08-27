-- AlterTable
ALTER TABLE "AudioBroadcastSlot" ADD COLUMN "announcement" TEXT;

UPDATE "AudioBroadcastSlot" AS slot
SET "announcement" = COALESCE(
  NULLIF(TRIM(lecture.title), ''),
  regexp_replace(lecture."originalName", '\.[^.]+$', '')
)
FROM "AudioLecture" AS lecture
WHERE lecture.id = slot."lectureId";

UPDATE "AudioBroadcastSlot"
SET "announcement" = 'Эфир'
WHERE "announcement" IS NULL OR TRIM("announcement") = '';

ALTER TABLE "AudioBroadcastSlot" ALTER COLUMN "announcement" SET NOT NULL;
