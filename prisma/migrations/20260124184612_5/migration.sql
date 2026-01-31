/*
  Warnings:

  - You are about to drop the column `msObjectId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `msTenantId` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('MICROSOFT', 'GOOGLE');

-- DropIndex
DROP INDEX "User_msTenantId_msObjectId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "msObjectId",
DROP COLUMN "msTenantId";

-- CreateTable
CREATE TABLE "UserOAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAllowedProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAllowedProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserOAuthAccount_userId_idx" ON "UserOAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOAuthAccount_provider_providerAccountId_key" ON "UserOAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "UserAllowedProvider_provider_idx" ON "UserAllowedProvider"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "UserAllowedProvider_userId_provider_key" ON "UserAllowedProvider"("userId", "provider");

-- AddForeignKey
ALTER TABLE "UserOAuthAccount" ADD CONSTRAINT "UserOAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAllowedProvider" ADD CONSTRAINT "UserAllowedProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
