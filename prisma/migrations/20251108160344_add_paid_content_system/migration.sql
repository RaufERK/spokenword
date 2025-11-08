-- CreateTable
CREATE TABLE "ContentPackage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    CONSTRAINT "ContentPackage_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packageId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "duration" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ContentPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPackageAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "packageId" INTEGER NOT NULL,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL NOT NULL,
    "grantedBy" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "UserPackageAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserPackageAccess_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ContentPackage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserPackageAccess_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PackageItem_packageId_orderIndex_idx" ON "PackageItem"("packageId", "orderIndex");

-- CreateIndex
CREATE INDEX "UserPackageAccess_userId_idx" ON "UserPackageAccess"("userId");

-- CreateIndex
CREATE INDEX "UserPackageAccess_packageId_idx" ON "UserPackageAccess"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPackageAccess_userId_packageId_key" ON "UserPackageAccess"("userId", "packageId");
