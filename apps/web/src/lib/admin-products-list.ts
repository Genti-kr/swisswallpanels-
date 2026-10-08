import { CategoryDTO, ProductDTO } from '@swisswall/types';
import { prisma } from '@/lib/prisma';
import { mapCategoryForAdmin, mapProductForAdmin } from '@/lib/admin-product-mapper';

function safeMapProduct(raw: Parameters<typeof mapProductForAdmin>[0]): ProductDTO | null {
  try {
    return mapProductForAdmin(raw);
  } catch (e) {
    console.error('admin product map skip', raw.id, e);
    return null;
  }
}

export async function listAdminCatalog(): Promise<{
  items: ProductDTO[];
  categories: CategoryDTO[];
}> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        category: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const items = products
    .map((p) => safeMapProduct(p))
    .filter((p): p is ProductDTO => p !== null);

  return {
    items,
    categories: categories.map(mapCategoryForAdmin),
  };
}
