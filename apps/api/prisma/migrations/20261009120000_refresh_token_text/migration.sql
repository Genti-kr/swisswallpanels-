-- JWT refresh tokens exceed VARCHAR(191); login failed on prisma.refreshToken.create
-- Use VARCHAR(768) (not TEXT) so UNIQUE index stays valid under InnoDB utf8mb4 limits.
ALTER TABLE `RefreshToken` MODIFY `token` VARCHAR(768) NOT NULL;
