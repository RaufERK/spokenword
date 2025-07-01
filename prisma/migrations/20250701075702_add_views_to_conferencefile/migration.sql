-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConferenceFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_ConferenceFile" ("displayName", "id", "originalName", "size", "systemName", "uploadedAt", "uploadedBy") SELECT "displayName", "id", "originalName", "size", "systemName", "uploadedAt", "uploadedBy" FROM "ConferenceFile";
DROP TABLE "ConferenceFile";
ALTER TABLE "new_ConferenceFile" RENAME TO "ConferenceFile";
CREATE UNIQUE INDEX "ConferenceFile_systemName_key" ON "ConferenceFile"("systemName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
