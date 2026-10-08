import { ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';

/** Must be ≤ API `pageSize` max (30); smaller pages avoid 500 on large JSON responses. */
const PAGE_SIZE = 12;
const MAX_PAGES = 200;

type ProductsListResponse = {
  items: ProductDTO[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

function withPaging(path: string, page: number, pageSize: number): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}page=${page}&pageSize=${pageSize}`;
}

/**
 * Loads every active product for the storefront (all pages until `total` is reached).
 */
export async function fetchAllProducts(path: string): Promise<ProductDTO[]> {
  const all: ProductDTO[] = [];
  let page = 1;
  let total: number | undefined;

  for (;;) {
    const res = await apiFetch<ProductsListResponse>(withPaging(path, page, PAGE_SIZE));
    if (typeof res.total === 'number') {
      total = res.total;
    }

    if (res.items.length === 0) {
      break;
    }

    all.push(...res.items);

    if (total !== undefined && all.length >= total) {
      break;
    }

    const totalPages =
      res.totalPages ??
      (total !== undefined ? Math.ceil(total / PAGE_SIZE) : undefined);

    if (totalPages !== undefined && page >= totalPages) {
      break;
    }

    if (res.items.length < PAGE_SIZE) {
      break;
    }

    page += 1;
    if (page > MAX_PAGES) {
      break;
    }
  }

  return all;
}
