import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { fetchInternalApiAsAdmin } from '@/lib/fetch-internal-api-as-admin';
import { listAdminCatalogPage } from '@/lib/admin-products-list';
import { proxyAdminApiJson } from '@/lib/proxy-admin-api-json';
import type { ProductDTO } from '@swisswall/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Keep each Hetzner response small (large JSON payloads return 500 behind nginx). */
const CATALOG_PAGE_SIZE = 12;
const MAX_CATALOG_PAGES = 200;

type AdminProductsPage = {
  items?: ProductDTO[];
  total?: number;
  totalPages?: number;
  error?: string;
  message?: string;
};

async function fetchAdminProductsPageFromApi(
  admin: NonNullable<Awaited<ReturnType<typeof getAdminSessionUser>>>,
  query: string
): Promise<{ ok: true; data: AdminProductsPage } | { ok: false; status: number; data: AdminProductsPage }> {
  const res = await fetchInternalApiAsAdmin(admin, `/api/admin/products${query}`);
  const data = (await res.json().catch(() => ({}))) as AdminProductsPage;
  if (!res.ok) {
    return { ok: false, status: res.status, data };
  }
  return { ok: true, data };
}

async function fetchAdminProductsPage(
  admin: NonNullable<Awaited<ReturnType<typeof getAdminSessionUser>>>,
  page: number,
  pageSize: number
): Promise<AdminProductsPage & { items: ProductDTO[] }> {
  const query = `?page=${page}&pageSize=${pageSize}`;
  const fromApi = await fetchAdminProductsPageFromApi(admin, query);
  if (fromApi.ok && (fromApi.data.items?.length !== undefined || fromApi.data.total !== undefined)) {
    return { ...fromApi.data, items: fromApi.data.items ?? [] };
  }

  if (fromApi.ok && !fromApi.data.total && (fromApi.data.items?.length ?? 0) > pageSize) {
    console.warn('admin products: API ignored pagination; using Vercel DB fallback');
  } else if (!fromApi.ok && fromApi.status >= 500) {
    console.warn('admin products: API error; using Vercel DB fallback', fromApi.data.error);
  } else if (!fromApi.ok) {
    throw new Error(fromApi.data.error || `API ${fromApi.status}`);
  }

  const fromDb = await listAdminCatalogPage(page, pageSize);
  return {
    items: fromDb.items,
    total: fromDb.total,
    totalPages: fromDb.totalPages,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const wantsSinglePage =
    searchParams.has('page') || searchParams.has('pageSize');

  try {
    if (wantsSinglePage) {
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const pageSize = Math.min(30, Math.max(1, Number(searchParams.get('pageSize') || CATALOG_PAGE_SIZE)));
      try {
        const data = await fetchAdminProductsPage(admin, page, pageSize);
        return NextResponse.json({
          items: data.items,
          total: data.total,
          page,
          pageSize,
          totalPages: data.totalPages,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Dështoi ngarkimi';
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const all: ProductDTO[] = [];
    let page = 1;
    let totalPages = 1;
    let total: number | undefined;

    while (page <= totalPages && page <= MAX_CATALOG_PAGES) {
      let data: AdminProductsPage & { items: ProductDTO[] };
      try {
        data = await fetchAdminProductsPage(admin, page, CATALOG_PAGE_SIZE);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Dështoi ngarkimi i produkteve';
        return NextResponse.json({ error: message }, { status: 502 });
      }

      const batch = data.items ?? [];
      if (typeof data.total === 'number') {
        total = data.total;
      }
      if (typeof data.totalPages === 'number') {
        totalPages = data.totalPages;
      } else if (total !== undefined) {
        totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
      }

      all.push(...batch);
      if (batch.length === 0) {
        break;
      }
      if (total !== undefined && all.length >= total) {
        break;
      }

      page += 1;
    }

    return NextResponse.json({ items: all, total: total ?? all.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('admin products proxy error:', error);
    return NextResponse.json(
      {
        error:
          'API serveri nuk është i arritshëm. Kontrollo INTERNAL_API_URL në Vercel dhe API-n në Hetzner.',
        message: process.env.NODE_ENV === 'production' ? undefined : message,
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.text();

  try {
    return await proxyAdminApiJson(admin, '/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (error) {
    console.error('admin product POST proxy error:', error);
    return NextResponse.json(
      { error: 'API serveri nuk është i arritshëm për krijimin e produktit.' },
      { status: 503 }
    );
  }
}
