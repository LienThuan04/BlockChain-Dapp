-- AlterTable
ALTER TABLE `users` ADD COLUMN `ethAddress` VARCHAR(42);

-- AlterTable
ALTER TABLE `orders` 
ADD COLUMN `txHash` VARCHAR(66),
ADD COLUMN `ethAmount` VARCHAR(255),
ADD COLUMN `ethPrice` FLOAT,
ADD COLUMN `blockNumber` INTEGER;