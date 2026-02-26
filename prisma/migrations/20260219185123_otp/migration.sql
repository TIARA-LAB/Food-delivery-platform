/*
  Warnings:

  - Added the required column `updatedAt` to the `cart_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cart_items` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `otpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `otpToken` VARCHAR(191) NULL;
