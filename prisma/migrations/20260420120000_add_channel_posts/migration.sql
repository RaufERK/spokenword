-- CreateTable
CREATE TABLE "ChannelPost" (
    "id" SERIAL NOT NULL,
    "telegramMessageId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelUsername" TEXT,
    "telegramDate" TIMESTAMP(3) NOT NULL,
    "text" TEXT,
    "mediaType" TEXT,
    "imageUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelPost_channelId_telegramMessageId_key" ON "ChannelPost"("channelId", "telegramMessageId");
CREATE INDEX "ChannelPost_isDeleted_telegramDate_idx" ON "ChannelPost"("isDeleted", "telegramDate" DESC);
