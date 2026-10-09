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

/** Max page buttons supported by catalog fetch (see fetch-all-products). */
export const CATALOG_PAGER_MAX_PAGES = 200;

/** Neighbors on each side of the active page (3 + active + 3 = 7 visible). */
export const CATALOG_PAGER_NEIGHBORS_EACH_SIDE = 3;

/** How many page numbers are visible at once in the pager (storefront + admin). */
export const CATALOG_PAGER_VISIBLE_COUNT =
  CATALOG_PAGER_NEIGHBORS_EACH_SIDE * 2 + 1;

/**
 * Up to 7 page buttons: active page with 3 before and 3 after when away from edges.
 * Start: 1…7 | middle page 50: 47…53 | end: clamped to last 7 pages (within 1…totalPages).
 */
export function getCatalogPagerVisiblePages(
  currentPage: number,
  totalPages: number
): number[] {
  const total = Math.min(Math.max(0, totalPages), CATALOG_PAGER_MAX_PAGES);
  if (total <= 0) return [];

  const page = Math.min(Math.max(1, currentPage), total);
  const windowSize = CATALOG_PAGER_VISIBLE_COUNT;

  if (total <= windowSize) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = page - CATALOG_PAGER_NEIGHBORS_EACH_SIDE;
  let end = page + CATALOG_PAGER_NEIGHBORS_EACH_SIDE;

  if (start < 1) {
    start = 1;
    end = windowSize;
  } else if (end > total) {
    end = total;
    start = total - windowSize + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
