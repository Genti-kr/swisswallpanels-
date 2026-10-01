/**
 * Removes ALL products and categories (fresh catalog).
 * Orders block product deletion — use --with-orders to delete every order first.
 *
 *   CONFIRM_WIPE_CATALOG=yes node scripts/wipe-catalog.mjs
 *   CONFIRM_WIPE_CATALOG=yes node scripts/wipe-catalog.mjs --with-orders
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const withOrders = process.argv.includes('--with-orders');

async function main() {
  if (process.env.CONFIRM_WIPE_CATALOG !== 'yes') {
    console.error('Set CONFIRM_WIPE_CATALOG=yes to run.');
    process.exit(1);
  }

  const [productCount, categoryCount, orderCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
  ]);

  console.log(
    `Will remove ${productCount} products, ${categoryCount} categories` +
      (withOrders ? ` and ${orderCount} orders` : `. Orders: ${orderCount} (use --with-orders if needed).`)
  );

  if (orderCount > 0 && !withOrders) {
    console.error(
      'Cannot delete products while orders exist. Delete test orders in admin first, or re-run with --with-orders.'
    );
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    if (withOrders) {
      await tx.orderStatusHistory.deleteMany();
      await tx.order.deleteMany();
    }
    await tx.cartItem.deleteMany();
    await tx.wishlistItem.deleteMany();
    await tx.review.deleteMany();
    await tx.quoteItem.updateMany({ data: { productId: null } });
    await tx.productImage.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany();
  });

  console.log('Catalog wiped. Add products in admin — category is created with each new product name.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
