-- AlterTable
ALTER TABLE "AudioLecture" ADD COLUMN "playableSystemName" TEXT;
ALTER TABLE "AudioLecture" ADD COLUMN "playableSize" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "AudioLecture_playableSystemName_key" ON "AudioLecture"("playableSystemName");
