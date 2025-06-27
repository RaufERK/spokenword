-- CreateTable
CREATE TABLE "ConferenceFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" INTEGER NOT NULL,
    "size" INTEGER NOT NULL
);
