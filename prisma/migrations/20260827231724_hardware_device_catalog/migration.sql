-- CreateEnum
CREATE TYPE "HardwareCategory" AS ENUM ('RGB_D_CAMERA', 'LIDAR_2D');

-- CreateEnum
CREATE TYPE "HardwareSupportStatus" AS ENUM ('ACTIVELY_MAINTAINED', 'COMMUNITY_MAINTAINED', 'LEGACY', 'DEPRECATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentBlockType" ADD VALUE 'SPEC_TABLE';
ALTER TYPE "ContentBlockType" ADD VALUE 'DEVICE_CARD';

-- AlterTable
ALTER TABLE "LessonContentBlock" ADD COLUMN     "hardwareDeviceId" TEXT;

-- CreateTable
CREATE TABLE "HardwareDevice" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "category" "HardwareCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "heroImageSrc" TEXT,
    "heroImageAlt" TEXT,
    "driverPackage" TEXT NOT NULL,
    "driverRepoUrl" TEXT NOT NULL,
    "rosDistroCompat" TEXT[],
    "supportStatus" "HardwareSupportStatus" NOT NULL,
    "supportStatusNote" TEXT,
    "homeSectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareDeviceSpec" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "whyItMatters" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "HardwareDeviceSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareDeviceTopic" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "HardwareDeviceTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HardwareDevice_slug_key" ON "HardwareDevice"("slug");

-- CreateIndex
CREATE INDEX "HardwareDevice_homeSectionId_idx" ON "HardwareDevice"("homeSectionId");

-- CreateIndex
CREATE INDEX "HardwareDevice_category_idx" ON "HardwareDevice"("category");

-- CreateIndex
CREATE INDEX "HardwareDeviceSpec_deviceId_sortOrder_idx" ON "HardwareDeviceSpec"("deviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "HardwareDeviceTopic_deviceId_sortOrder_idx" ON "HardwareDeviceTopic"("deviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "LessonContentBlock_hardwareDeviceId_idx" ON "LessonContentBlock"("hardwareDeviceId");

-- AddForeignKey
ALTER TABLE "LessonContentBlock" ADD CONSTRAINT "LessonContentBlock_hardwareDeviceId_fkey" FOREIGN KEY ("hardwareDeviceId") REFERENCES "HardwareDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDevice" ADD CONSTRAINT "HardwareDevice_homeSectionId_fkey" FOREIGN KEY ("homeSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDeviceSpec" ADD CONSTRAINT "HardwareDeviceSpec_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "HardwareDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDeviceTopic" ADD CONSTRAINT "HardwareDeviceTopic_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "HardwareDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
