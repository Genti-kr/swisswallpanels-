import { CategoryDTO, ProductDTO } from '@swisswall/types';

type AdminCatalogResponse = {
  items: ProductDTO[];
  categories?: CategoryDTO[];
};

async function fetchFromVercelCatalog(): Promise<AdminCatalogResponse> {
  const res = await fetch('/api/admin/products', {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as AdminCatalogResponse & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const detail = data.message || data.error || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return { items: data.items ?? [], categories: data.categories };
}

async function fetchFromBackendCatalog(): Promise<AdminCatalogResponse> {
  const res = await fetch('/api/backend/admin/products', {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as AdminCatalogResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `API ${res.status}`);
  }
  return { items: data.items ?? [] };
}

/** Lista admin: Vercel (DB direkt + sesion), pastaj Hetzner API. */
export async function fetchAdminProductCatalog(): Promise<AdminCatalogResponse> {
  const errors: string[] = [];

  try {
    return await fetchFromVercelCatalog();
  } catch (vercelErr) {
    errors.push(vercelErr instanceof Error ? vercelErr.message : 'Vercel list failed');
  }

  try {
    return await fetchFromBackendCatalog();
  } catch (backendErr) {
    const msg = backendErr instanceof Error ? backendErr.message : 'API list failed';
    errors.push(msg);
  }

  throw new Error(
    errors.length
      ? `Lista e produkteve dështoi (${errors.join(' · ')}).`
      : 'Lista e produkteve dështoi.'
  );
}
