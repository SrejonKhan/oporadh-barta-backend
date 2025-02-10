/*
  Warnings:

  - The values [FACULTY] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phoneNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('EMAILPASS', 'OAUTH');

-- CreateEnum
CREATE TYPE "SocialLinkHost" AS ENUM ('LINKEDIN', 'GITHUB', 'FACEBOOK', 'INSTAGRAM', 'MAIL', 'TWITTER', 'UNKNOWN');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "authType" "AuthType" NOT NULL DEFAULT 'EMAILPASS',
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "UserProfile" (
    "profileIntro" TEXT,
    "designation" TEXT,
    "avatarUrl" TEXT,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "SocialLink" (
    "url" TEXT NOT NULL,
    "host" "SocialLinkHost" NOT NULL DEFAULT 'UNKNOWN',
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ChangePasswordRequest" (
    "token" TEXT NOT NULL,
    "reqIpAddress" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLink_userId_key" ON "SocialLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangePasswordRequest_token_key" ON "ChangePasswordRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ChangePasswordRequest_userId_key" ON "ChangePasswordRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLink" ADD CONSTRAINT "SocialLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangePasswordRequest" ADD CONSTRAINT "ChangePasswordRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
