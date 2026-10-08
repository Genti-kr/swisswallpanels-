import { ProductDTO } from '@swisswall/types';

/** Client-side search (name in all langs, slug, SKU). API search only matches slug/SKU. */
export function filterProductsBySearch(
  products: ProductDTO[],
  query: string
): ProductDTO[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;

  return products.filter((p) => {
    const names = Object.values(p.nameJson ?? {})
      .join(' ')
      .toLowerCase();
    const desc = Object.values(p.descJson ?? {})
      .join(' ')
      .toLowerCase();
    const slug = (p.slug ?? '').toLowerCase();
    const sku = (p.sku ?? '').toLowerCase();
    const cat = Object.values(p.category?.nameJson ?? {})
      .join(' ')
      .toLowerCase();
    return (
      names.includes(q) ||
      desc.includes(q) ||
      slug.includes(q) ||
      sku.includes(q) ||
      cat.includes(q) ||
      names.split(/\s+/).some((w) => w.startsWith(q))
    );
  });
}
