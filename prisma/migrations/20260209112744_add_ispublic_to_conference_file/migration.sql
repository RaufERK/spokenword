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
    "size" BIGINT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ConferenceFile" ("displayName", "duration", "id", "originalName", "size", "systemName", "uploadedAt", "uploadedBy", "views") SELECT "displayName", "duration", "id", "originalName", "size", "systemName", "uploadedAt", "uploadedBy", "views" FROM "ConferenceFile";
DROP TABLE "ConferenceFile";
ALTER TABLE "new_ConferenceFile" RENAME TO "ConferenceFile";
CREATE UNIQUE INDEX "ConferenceFile_systemName_key" ON "ConferenceFile"("systemName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
