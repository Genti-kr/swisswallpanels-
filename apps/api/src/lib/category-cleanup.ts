import type { Prisma } from '@prisma/client';

/** Removes category when it has no products left (e.g. after product delete). */
export async function deleteCategoryIfEmpty(
  tx: Prisma.TransactionClient,
  categoryId: string | null | undefined
): Promise<boolean> {
  if (!categoryId) return false;
  const remaining = await tx.product.count({ where: { categoryId } });
  if (remaining > 0) return false;
  try {
    await tx.category.delete({ where: { id: categoryId } });
    return true;
  } catch {
    return false;
  }
}
