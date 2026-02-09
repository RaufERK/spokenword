-- Change size columns from INT to BIGINT for large files (> 2GB)
-- SQLite: Recreate tables with new schema

PRAGMA foreign_keys=OFF;

-- ========================================
-- 1. ConferenceFile: size INT → BIGINT
-- ========================================

CREATE TABLE "ConferenceFile_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" INTEGER NOT NULL,
    "size" BIGINT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER
);

-- Copy data
INSERT INTO "ConferenceFile_new" 
SELECT "id", "displayName", "originalName", "systemName", "uploadedAt", "uploadedBy", "size", "views", "duration"
FROM "ConferenceFile";

-- Drop old table
DROP TABLE "ConferenceFile";

-- Rename new table
ALTER TABLE "ConferenceFile_new" RENAME TO "ConferenceFile";

-- Recreate unique index
CREATE UNIQUE INDEX "ConferenceFile_systemName_key" ON "ConferenceFile"("systemName");

-- ========================================
-- 2. PackageItem: originalSize, compressedSize INT → BIGINT
-- ========================================

CREATE TABLE "PackageItem_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packageId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL DEFAULT '',
    "filePath" TEXT NOT NULL,
    "duration" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "originalSize" BIGINT NOT NULL,
    "compressedSize" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ContentPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "PackageItem_new" 
SELECT "id", "packageId", "title", "fileName", "originalName", "filePath", "duration", "orderIndex", "originalSize", "compressedSize", "createdAt"
FROM "PackageItem";

-- Drop old table
DROP TABLE "PackageItem";

-- Rename new table
ALTER TABLE "PackageItem_new" RENAME TO "PackageItem";

-- Recreate indexes
CREATE INDEX "PackageItem_packageId_orderIndex_idx" ON "PackageItem"("packageId", "orderIndex");
CREATE INDEX "PackageItem_packageId_originalName_originalSize_idx" ON "PackageItem"("packageId", "originalName", "originalSize");

PRAGMA foreign_keys=ON;
