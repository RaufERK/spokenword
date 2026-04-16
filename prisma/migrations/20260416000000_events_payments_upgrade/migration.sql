-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable Event: add accessDays
ALTER TABLE "Event" ADD COLUMN "accessDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable UserEventAccess: add status, revokedBy, revokedAt
ALTER TABLE "UserEventAccess" ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "UserEventAccess" ADD COLUMN "revokedBy" INTEGER;
ALTER TABLE "UserEventAccess" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- AddForeignKey: UserEventAccess.revokedBy -> User.id
ALTER TABLE "UserEventAccess" ADD CONSTRAINT "UserEventAccess_revokedBy_fkey"
  FOREIGN KEY ("revokedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddIndex: UserEventAccess.eventId
CREATE INDEX IF NOT EXISTS "UserEventAccess_eventId_idx" ON "UserEventAccess"("eventId");

-- AlterTable ConferenceFile: add eventId
ALTER TABLE "ConferenceFile" ADD COLUMN "eventId" INTEGER;

-- AddForeignKey: ConferenceFile.eventId -> Event.id
ALTER TABLE "ConferenceFile" ADD CONSTRAINT "ConferenceFile_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable User: remove paymentDate
ALTER TABLE "User" DROP COLUMN IF EXISTS "paymentDate";

-- DropIndex: User_paymentDate_idx
DROP INDEX IF EXISTS "User_paymentDate_idx";
