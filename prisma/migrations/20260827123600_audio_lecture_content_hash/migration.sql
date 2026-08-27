-- AlterTable
ALTER TABLE "AudioLecture" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AudioLecture_contentHash_key" ON "AudioLecture"("contentHash");
