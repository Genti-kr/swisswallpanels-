-- CreateTable
CREATE TABLE `SiteImage` (
    `id` VARCHAR(191) NOT NULL,
    `section` ENUM('GALLERY', 'ABOUT') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `altJson` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
