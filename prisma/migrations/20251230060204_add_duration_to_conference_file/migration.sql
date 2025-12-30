-- DropIndex
DROP INDEX "PackageItem_packageId_originalName_originalSize_key";

-- AlterTable
ALTER TABLE "ConferenceFile" ADD COLUMN "duration" INTEGER;

-- CreateIndex
CREATE INDEX "PackageItem_packageId_originalName_originalSize_idx" ON "PackageItem"("packageId", "originalName", "originalSize");
