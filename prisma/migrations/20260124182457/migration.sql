/*
  Warnings:

  - A unique constraint covering the columns `[msTenantId,msObjectId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "msObjectId" TEXT,
ADD COLUMN     "msTenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_msTenantId_msObjectId_key" ON "User"("msTenantId", "msObjectId");
