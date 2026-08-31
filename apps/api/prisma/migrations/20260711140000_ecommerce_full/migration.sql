-- Safe migration: skip columns/tables that already exist
SET @db := DATABASE();

-- lockUntil on User
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND COLUMN_NAME = 'lockUntil'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `User` ADD COLUMN `lockUntil` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- lockReason on User
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND COLUMN_NAME = 'lockReason'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `User` ADD COLUMN `lockReason` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- country on User
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND COLUMN_NAME = 'country'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `User` ADD COLUMN `country` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Migrate legacy roles
UPDATE `User` SET `role` = 'USER' WHERE `role` IN ('CUSTOMER', 'B2B', 'GUEST');

-- Role enum cleanup (may already be applied)
ALTER TABLE `User` MODIFY `role` ENUM('USER', 'ADMIN', 'SUPERADMIN') NOT NULL DEFAULT 'USER';

-- Address type
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Address' AND COLUMN_NAME = 'type'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Address` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT ''shipping''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: guestName
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'guestName'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `guestName` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: paymentStatus
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'paymentStatus'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `paymentStatus` ENUM(''PENDING'', ''PAID'', ''FAILED'', ''REFUNDED'', ''PARTIALLY_REFUNDED'') NOT NULL DEFAULT ''PENDING''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: deliveryStatus
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'deliveryStatus'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `deliveryStatus` ENUM(''NEW'', ''PROCESSING'', ''READY_TO_SHIP'', ''SHIPPED'', ''DELIVERED'', ''CANCELLED'', ''RETURNED'') NOT NULL DEFAULT ''NEW''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: country
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'country'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `country` VARCHAR(191) NOT NULL DEFAULT ''CH''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: currency
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'currency'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT ''CHF''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: couponCode
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'couponCode'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `couponCode` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: shippingMethod
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'shippingMethod'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `shippingMethod` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: shippingCarrier
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'shippingCarrier'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `shippingCarrier` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: trackingNumber
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'trackingNumber'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `trackingNumber` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: estimatedDelivery
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'estimatedDelivery'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `estimatedDelivery` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: refundAmount
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'refundAmount'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `refundAmount` DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: refundReason
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'refundReason'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `refundReason` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order: refundedAt
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'refundedAt'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `Order` ADD COLUMN `refundedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- OrderItem: productSku
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'OrderItem' AND COLUMN_NAME = 'productSku'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `OrderItem` ADD COLUMN `productSku` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- OrderItem: imageUrl
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'OrderItem' AND COLUMN_NAME = 'imageUrl'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `OrderItem` ADD COLUMN `imageUrl` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- OrderStatusHistory: adminId
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'OrderStatusHistory' AND COLUMN_NAME = 'adminId'
);
SET @sql := IF(@exists = 0, 'ALTER TABLE `OrderStatusHistory` ADD COLUMN `adminId` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ShippingRate table
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

-- AppSetting table
CREATE TABLE IF NOT EXISTS `AppSetting` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'global',
  `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
  `maintenanceMessage` TEXT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `AppSetting` (`id`, `maintenanceMode`, `updatedAt`) VALUES ('global', false, NOW(3));
