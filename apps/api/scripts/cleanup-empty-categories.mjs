/**
 * Deletes categories with zero products (e.g. after manual product delete before API fix).
 *   node scripts/cleanup-empty-categories.mjs
 *   CONFIRM=yes node scripts/cleanup-empty-categories.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.env.CONFIRM !== 'yes';

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, _count: { select: { products: true } } },
  });
  const empty = categories.filter((c) => c._count.products === 0);
  if (empty.length === 0) {
    console.log('No empty categories.');
    return;
  }
  console.log(
    dryRun
      ? `[dry run] Would delete ${empty.length}: ${empty.map((c) => c.slug).join(', ')}`
      : `Deleting ${empty.length}: ${empty.map((c) => c.slug).join(', ')}`
  );
  if (dryRun) {
    console.log('Re-run with CONFIRM=yes to delete.');
    return;
  }
  await prisma.category.deleteMany({ where: { id: { in: empty.map((c) => c.id) } } });
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
