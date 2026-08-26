-- CreateEnum
CREATE TYPE "AudioBroadcastStatus" AS ENUM ('SCHEDULED', 'PLAYING', 'DONE', 'SKIPPED_LIVE', 'FAILED');

-- CreateTable
CREATE TABLE "AudioCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "AudioCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioLecture" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "durationSec" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioLecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioBroadcastSlot" (
    "id" SERIAL NOT NULL,
    "lectureId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "AudioBroadcastStatus" NOT NULL DEFAULT 'SCHEDULED',
    "errorLog" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioBroadcastSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AudioCategoryToAudioLecture" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AudioCategory_name_key" ON "AudioCategory"("name");
CREATE UNIQUE INDEX "AudioCategory_slug_key" ON "AudioCategory"("slug");
CREATE UNIQUE INDEX "AudioLecture_systemName_key" ON "AudioLecture"("systemName");
CREATE INDEX "AudioLecture_uploadedBy_idx" ON "AudioLecture"("uploadedBy");
CREATE INDEX "AudioLecture_isPublished_uploadedAt_idx" ON "AudioLecture"("isPublished", "uploadedAt");
CREATE INDEX "AudioBroadcastSlot_startsAt_status_idx" ON "AudioBroadcastSlot"("startsAt", "status");
CREATE INDEX "AudioBroadcastSlot_lectureId_idx" ON "AudioBroadcastSlot"("lectureId");
CREATE UNIQUE INDEX "_AudioCategoryToAudioLecture_AB_unique" ON "_AudioCategoryToAudioLecture"("A", "B");
CREATE INDEX "_AudioCategoryToAudioLecture_B_index" ON "_AudioCategoryToAudioLecture"("B");

-- AddForeignKey
ALTER TABLE "AudioLecture" ADD CONSTRAINT "AudioLecture_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AudioBroadcastSlot" ADD CONSTRAINT "AudioBroadcastSlot_lectureId_fkey"
    FOREIGN KEY ("lectureId") REFERENCES "AudioLecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AudioBroadcastSlot" ADD CONSTRAINT "AudioBroadcastSlot_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "_AudioCategoryToAudioLecture" ADD CONSTRAINT "_AudioCategoryToAudioLecture_A_fkey"
    FOREIGN KEY ("A") REFERENCES "AudioCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AudioCategoryToAudioLecture" ADD CONSTRAINT "_AudioCategoryToAudioLecture_B_fkey"
    FOREIGN KEY ("B") REFERENCES "AudioLecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
