/*
  Warnings:

  - Made the column `firebaseUid` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "firebaseUid" SET NOT NULL;
