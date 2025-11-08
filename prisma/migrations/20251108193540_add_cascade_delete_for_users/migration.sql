-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPackageAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "packageId" INTEGER NOT NULL,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL NOT NULL,
    "grantedBy" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "UserPackageAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPackageAccess_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ContentPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPackageAccess_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserPackageAccess" ("grantedBy", "id", "notes", "packageId", "price", "purchaseDate", "userId") SELECT "grantedBy", "id", "notes", "packageId", "price", "purchaseDate", "userId" FROM "UserPackageAccess";
DROP TABLE "UserPackageAccess";
ALTER TABLE "new_UserPackageAccess" RENAME TO "UserPackageAccess";
CREATE INDEX "UserPackageAccess_userId_idx" ON "UserPackageAccess"("userId");
CREATE INDEX "UserPackageAccess_packageId_idx" ON "UserPackageAccess"("packageId");
CREATE UNIQUE INDEX "UserPackageAccess_userId_packageId_key" ON "UserPackageAccess"("userId", "packageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
