-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PackageItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packageId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL DEFAULT '',
    "filePath" TEXT NOT NULL,
    "duration" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ContentPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PackageItem" ("compressedSize", "createdAt", "duration", "fileName", "filePath", "id", "orderIndex", "originalSize", "packageId", "title") SELECT "compressedSize", "createdAt", "duration", "fileName", "filePath", "id", "orderIndex", "originalSize", "packageId", "title" FROM "PackageItem";
DROP TABLE "PackageItem";
ALTER TABLE "new_PackageItem" RENAME TO "PackageItem";
CREATE INDEX "PackageItem_packageId_orderIndex_idx" ON "PackageItem"("packageId", "orderIndex");
CREATE UNIQUE INDEX "PackageItem_packageId_originalName_originalSize_key" ON "PackageItem"("packageId", "originalName", "originalSize");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
