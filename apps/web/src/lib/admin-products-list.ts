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

function safeMapCategory(raw: Parameters<typeof mapCategoryForAdmin>[0]): CategoryDTO | null {
  try {
    return mapCategoryForAdmin(raw);
  } catch (e) {
    console.error('admin category map skip', raw.id, e);
    return null;
  }
}

export async function listAdminCatalogPage(
  page: number,
  pageSize: number
): Promise<{ items: ProductDTO[]; total: number; totalPages: number }> {
  const [total, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        category: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = products
    .map((p) => safeMapProduct(p))
    .filter((p): p is ProductDTO => p !== null);

  return {
    items,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listAdminCatalog(): Promise<{
  items: ProductDTO[];
  categories: CategoryDTO[];
}> {
  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      category: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  let categories: CategoryDTO[] = [];
  try {
    const rows = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    categories = rows
      .map((c) => safeMapCategory(c))
      .filter((c): c is CategoryDTO => c !== null);
  } catch (e) {
    console.error('admin categories load failed', e);
  }

  const items = products
    .map((p) => safeMapProduct(p))
    .filter((p): p is ProductDTO => p !== null);

  return { items, categories };
}
