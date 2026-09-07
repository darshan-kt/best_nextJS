-- CreateEnum
CREATE TYPE "DatasetLevel" AS ENUM ('SYNTHETIC', 'RECORDED', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "DatasetFormat" AS ENUM ('CSV', 'JSON');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentBlockType" ADD VALUE 'DISTRIBUTION_SIM';
ALTER TYPE "ContentBlockType" ADD VALUE 'DATASET_EXPLORER';

-- AlterTable
ALTER TABLE "LessonContentBlock" ADD COLUMN     "datasetId" TEXT;

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "level" "DatasetLevel" NOT NULL,
    "sourceUri" TEXT NOT NULL,
    "format" "DatasetFormat" NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "provenance" JSONB,
    "hardwareDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_slug_key" ON "Dataset"("slug");

-- CreateIndex
CREATE INDEX "Dataset_level_idx" ON "Dataset"("level");

-- CreateIndex
CREATE INDEX "Dataset_hardwareDeviceId_idx" ON "Dataset"("hardwareDeviceId");

-- CreateIndex
CREATE INDEX "LessonContentBlock_datasetId_idx" ON "LessonContentBlock"("datasetId");

-- AddForeignKey
ALTER TABLE "LessonContentBlock" ADD CONSTRAINT "LessonContentBlock_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_hardwareDeviceId_fkey" FOREIGN KEY ("hardwareDeviceId") REFERENCES "HardwareDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
