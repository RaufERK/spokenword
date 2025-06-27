/*
  Warnings:

  - A unique constraint covering the columns `[systemName]` on the table `ConferenceFile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ConferenceFile_systemName_key" ON "ConferenceFile"("systemName");
