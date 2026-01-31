/*
  Warnings:

  - You are about to drop the column `email` on the `UserOAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `providerAccountId` on the `UserOAuthAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,providerUserId]` on the table `UserOAuthAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerUserId` to the `UserOAuthAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropIndex
DROP INDEX "UserOAuthAccount_provider_providerAccountId_key";

-- AlterTable
ALTER TABLE "UserOAuthAccount" DROP COLUMN "email",
DROP COLUMN "providerAccountId",
ADD COLUMN     "issuer" TEXT,
ADD COLUMN     "providerUserId" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT;

-- CreateTable
CREATE TABLE "IdentityProviderTenant" (
    "id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityProviderTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityProviderTenant_provider_idx" ON "IdentityProviderTenant"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityProviderTenant_provider_tenantId_key" ON "IdentityProviderTenant"("provider", "tenantId");

-- CreateIndex
CREATE INDEX "UserOAuthAccount_provider_issuer_idx" ON "UserOAuthAccount"("provider", "issuer");

-- CreateIndex
CREATE INDEX "UserOAuthAccount_provider_tenantId_idx" ON "UserOAuthAccount"("provider", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOAuthAccount_provider_providerUserId_key" ON "UserOAuthAccount"("provider", "providerUserId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
