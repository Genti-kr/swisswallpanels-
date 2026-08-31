import { ColorCatalogDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';

export async function fetchColorCatalogs(): Promise<ColorCatalogDTO[]> {
  const res = await apiFetch<{ items: ColorCatalogDTO[] }>('/api/catalogs');
  return res.items;
}

export async function fetchColorCatalogBySlug(slug: string): Promise<ColorCatalogDTO | null> {
  try {
    const res = await apiFetch<{ catalog: ColorCatalogDTO }>(`/api/catalogs/${slug}`);
    return res.catalog;
  } catch {
    return null;
  }
}
