-- Roles + shipping (restored for migration history; already applied to DB)
UPDATE `User` SET `role` = 'USER' WHERE `role` IN ('CUSTOMER', 'B2B', 'GUEST');

ALTER TABLE `User` MODIFY `role` ENUM('USER', 'ADMIN', 'SUPERADMIN') NOT NULL DEFAULT 'USER';

CREATE TABLE IF NOT EXISTS `ShippingRate` (
  `id` VARCHAR(191) NOT NULL,
  `country` VARCHAR(191) NOT NULL,
  `carrier` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(191) NOT NULL,
  `minDays` INTEGER NOT NULL,
  `maxDays` INTEGER NOT NULL,
  `freeAbove` DECIMAL(10,2) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
