-- AlterTable
ALTER TABLE "ConferenceFile" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClassFile" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ConferenceFile_deletedAt_idx" ON "ConferenceFile"("deletedAt");

-- CreateIndex
CREATE INDEX "ClassFile_deletedAt_idx" ON "ClassFile"("deletedAt");
