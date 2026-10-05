export const PRODUCTS_CATALOG_PAGE_SIZE = 15;

export function getCatalogPageCount(totalProducts: number): number {
  if (totalProducts <= 0) return 0;
  return Math.ceil(totalProducts / PRODUCTS_CATALOG_PAGE_SIZE);
}

export function getCatalogPageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PRODUCTS_CATALOG_PAGE_SIZE;
  return items.slice(start, start + PRODUCTS_CATALOG_PAGE_SIZE);
}
