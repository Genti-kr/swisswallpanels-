import { CategoryDTO, ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';

type AdminCatalogResponse = {
  items: ProductDTO[];
  categories?: CategoryDTO[];
};

/** Hetzner API first (si më parë); nëse dështon, provo listën nga Vercel/Prisma. */
export async function fetchAdminProductCatalog(): Promise<AdminCatalogResponse> {
  try {
    return await apiFetch<AdminCatalogResponse>('/api/admin/products');
  } catch (backendErr) {
    try {
      const res = await fetch('/api/admin/products', { credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as AdminCatalogResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Vercel list ${res.status}`);
      }
      return { items: data.items ?? [], categories: data.categories };
    } catch {
      throw backendErr;
    }
  }
}
