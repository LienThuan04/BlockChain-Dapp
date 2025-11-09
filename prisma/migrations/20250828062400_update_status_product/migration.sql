/*
  Warnings:

  - You are about to drop the column `sold` on the `product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `product` DROP COLUMN `sold`,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT';
