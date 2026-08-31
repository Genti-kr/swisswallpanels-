-- ============================================================
-- Swiss Wall Panels — Setup për phpMyAdmin (XAMPP / MariaDB)
-- ============================================================
-- HAPI 1: Hyr si root në phpMyAdmin (XAMPP: user root, pa fjalëkalim)
-- HAPI 2: Ekzekuto VETËM këtë SQL (mos përdor CREATE USER / FLUSH PRIVILEGES
--         nëse merr gabim Aria #1030)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `swisswallpanels`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- OPSIONI A (REKOMANDUAR për XAMPP lokal): përdor root
-- Ndrysho .env në:
--   DATABASE_URL="mysql://root:@localhost:3306/swisswallpanels?charset=utf8mb4"
-- Pastaj në terminal:
--   cd apps/api
--   pnpm prisma:generate
--   pnpm prisma:migrate
--   pnpm seed
-- ============================================================

-- ============================================================
-- OPSIONI B (vetëm nëse MySQL/MariaDB është i shëndetshëm):
-- Ekzekuto rreshtat më poshtë SEPARATISHT, një nga një.
-- Nëse FLUSH PRIVILEGES jep gabim Aria, përdor Opsionin A.
-- ============================================================

-- CREATE USER IF NOT EXISTS 'swisswalluser'@'localhost' IDENTIFIED BY 'swisswallpassword';
-- GRANT ALL PRIVILEGES ON `swisswallpanels`.* TO 'swisswalluser'@'localhost';
-- FLUSH PRIVILEGES;
