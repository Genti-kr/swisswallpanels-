-- Missing column referenced by Prisma schema
ALTER TABLE `User` ADD COLUMN `lockUntil` DATETIME(3) NULL;
