-- Add accessUntil to User
ALTER TABLE "User" ADD COLUMN "accessUntil" DATETIME;

-- Create Event table
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CONFERENCE',
    "startDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UserEventAccess table
CREATE TABLE "UserEventAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" INTEGER NOT NULL,
    CONSTRAINT "UserEventAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserEventAccess_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserEventAccess_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserEventAccess_userId_eventId_key" ON "UserEventAccess"("userId", "eventId");
CREATE INDEX "UserEventAccess_userId_idx" ON "UserEventAccess"("userId");
CREATE INDEX "User_accessUntil_idx" ON "User"("accessUntil");
