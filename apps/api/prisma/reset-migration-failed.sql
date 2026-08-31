-- ============================================================
-- RESET pas gabimit P3018 (migrimi dështoi gjysmë)
-- Ekzekuto në phpMyAdmin → swisswallpanels → SQL
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `_prisma_migrations`;
DROP TABLE IF EXISTS `NewsletterSubscriber`;
DROP TABLE IF EXISTS `ContactMessage`;
DROP TABLE IF EXISTS `DiscountCode`;
DROP TABLE IF EXISTS `Review`;
DROP TABLE IF EXISTS `WishlistItem`;
DROP TABLE IF EXISTS `Wishlist`;
DROP TABLE IF EXISTS `QuoteItem`;
DROP TABLE IF EXISTS `Quote`;
DROP TABLE IF EXISTS `OrderStatusHistory`;
DROP TABLE IF EXISTS `OrderItem`;
DROP TABLE IF EXISTS `Order`;
DROP TABLE IF EXISTS `CartItem`;
DROP TABLE IF EXISTS `Cart`;
DROP TABLE IF EXISTS `ProductImage`;
DROP TABLE IF EXISTS `ProductVariant`;
DROP TABLE IF EXISTS `Product`;
DROP TABLE IF EXISTS `Category`;
DROP TABLE IF EXISTS `Address`;
DROP TABLE IF EXISTS `RefreshToken`;
DROP TABLE IF EXISTS `User`;

SET FOREIGN_KEY_CHECKS = 1;

-- Pastaj në terminal:
--   cd apps/api
--   pnpm prisma migrate deploy
--   pnpm seed
