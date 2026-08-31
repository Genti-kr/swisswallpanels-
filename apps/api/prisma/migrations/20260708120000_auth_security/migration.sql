-- Auth security fields on User
ALTER TABLE `User` ADD COLUMN `isLocked` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `failedAttempts` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `User` ADD COLUMN `unlockToken` VARCHAR(191) NULL;
ALTER TABLE `User` ADD COLUMN `unlockTokenExpires` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `passwordResetToken` VARCHAR(191) NULL;
ALTER TABLE `User` ADD COLUMN `passwordResetExpires` DATETIME(3) NULL;

CREATE UNIQUE INDEX `User_unlockToken_key` ON `User`(`unlockToken`);
CREATE UNIQUE INDEX `User_passwordResetToken_key` ON `User`(`passwordResetToken`);

-- Add USER role to enum
ALTER TABLE `User` MODIFY `role` ENUM('GUEST', 'CUSTOMER', 'B2B', 'ADMIN', 'SUPERADMIN', 'USER') NOT NULL DEFAULT 'CUSTOMER';

-- AuditLog table
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- FailedAttempt table (rate limiting / brute force)
CREATE TABLE `FailedAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `blockedAt` DATETIME(3) NULL,

    UNIQUE INDEX `FailedAttempt_ip_key`(`ip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
