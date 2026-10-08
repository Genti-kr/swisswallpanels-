export const PRODUCTS_CATALOG_PAGE_SIZE = 15;

/** Fixed header offset when scrolling to the product grid. */
export const CATALOG_SCROLL_HEADER_OFFSET = 112;

export function scrollToCatalogAnchor(anchor: HTMLElement | null) {
  if (!anchor || typeof window === 'undefined') return;
  const top =
    anchor.getBoundingClientRect().top + window.scrollY - CATALOG_SCROLL_HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

export function getCatalogPageCount(totalProducts: number): number {
  if (totalProducts <= 0) return 0;
  return Math.ceil(totalProducts / PRODUCTS_CATALOG_PAGE_SIZE);
}

export function getCatalogPageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PRODUCTS_CATALOG_PAGE_SIZE;
  return items.slice(start, start + PRODUCTS_CATALOG_PAGE_SIZE);
}
