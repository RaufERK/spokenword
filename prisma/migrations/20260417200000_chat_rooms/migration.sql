-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('GENERAL', 'SUPPORT', 'PRIVATE');

-- CreateTable ChatRoom
CREATE TABLE "ChatRoom" (
    "id" SERIAL NOT NULL,
    "type" "ChatRoomType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChatRoomParticipant
CREATE TABLE "ChatRoomParticipant" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    CONSTRAINT "ChatRoomParticipant_pkey" PRIMARY KEY ("id")
);

-- Add roomId to ChatMessage (nullable first for migration)
ALTER TABLE "ChatMessage" ADD COLUMN "roomId" INTEGER;

-- Create GENERAL room and migrate all existing messages into it
INSERT INTO "ChatRoom" ("type", "createdAt", "updatedAt")
VALUES ('GENERAL', NOW(), NOW());

UPDATE "ChatMessage"
SET "roomId" = (SELECT "id" FROM "ChatRoom" WHERE "type" = 'GENERAL' LIMIT 1);

-- Make roomId NOT NULL
ALTER TABLE "ChatMessage" ALTER COLUMN "roomId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoomParticipant_roomId_userId_key" ON "ChatRoomParticipant"("roomId", "userId");
CREATE INDEX "ChatRoomParticipant_userId_idx" ON "ChatRoomParticipant"("userId");
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatRoomParticipant" ADD CONSTRAINT "ChatRoomParticipant_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatRoomParticipant" ADD CONSTRAINT "ChatRoomParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
