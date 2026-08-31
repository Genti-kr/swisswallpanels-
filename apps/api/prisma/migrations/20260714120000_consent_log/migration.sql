-- CreateTable
CREATE TABLE `ConsentLog` (
    `id` VARCHAR(191) NOT NULL,
    `consentId` VARCHAR(191) NOT NULL,
    `necessary` BOOLEAN NOT NULL DEFAULT true,
    `analytics` BOOLEAN NOT NULL DEFAULT false,
    `marketing` BOOLEAN NOT NULL DEFAULT false,
    `ipHash` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `locale` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConsentLog_consentId_idx`(`consentId`),
    INDEX `ConsentLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
