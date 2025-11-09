/*
  Warnings:

  - You are about to drop the column `blockNumber` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `ethAmount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `ethPrice` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `txHash` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `ethAddress` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `orders` DROP COLUMN `blockNumber`,
    DROP COLUMN `ethAmount`,
    DROP COLUMN `ethPrice`,
    DROP COLUMN `txHash`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `ethAddress`;

-- CreateTable
CREATE TABLE `crypto_wallets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `walletAddress` VARCHAR(255) NOT NULL,
    `privateKey` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `crypto_wallets_walletAddress_key`(`walletAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cryptocurrencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `symbol` VARCHAR(10) NOT NULL,
    `priceVND` DOUBLE NOT NULL DEFAULT 8750,
    `chainName` VARCHAR(100) NOT NULL,
    `rpcUrl` VARCHAR(500) NOT NULL,
    `chainId` VARCHAR(50) NOT NULL,
    `contractAddress` VARCHAR(255) NULL,
    `decimals` INTEGER NOT NULL DEFAULT 18,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cryptocurrencies_name_key`(`name`),
    UNIQUE INDEX `cryptocurrencies_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crypto_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionHash` VARCHAR(255) NOT NULL,
    `fromAddress` VARCHAR(255) NOT NULL,
    `toAddress` VARCHAR(255) NOT NULL,
    `amount` VARCHAR(255) NOT NULL,
    `amountInFiat` DOUBLE NOT NULL,
    `gasUsed` VARCHAR(255) NULL,
    `gasPrice` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `orderId` INTEGER NOT NULL,
    `cryptoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `crypto_transactions_transactionHash_key`(`transactionHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crypto_transactions` ADD CONSTRAINT `crypto_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crypto_transactions` ADD CONSTRAINT `crypto_transactions_cryptoId_fkey` FOREIGN KEY (`cryptoId`) REFERENCES `cryptocurrencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
