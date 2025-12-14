/*
  Warnings:

  - Made the column `slug` on table `tenants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "slug" SET NOT NULL;
