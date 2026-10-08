import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { fetchInternalApiAsAdmin } from '@/lib/fetch-internal-api-as-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetchInternalApiAsAdmin(admin, '/api/admin/products');
    const data = (await res.json().catch(() => ({}))) as {
      items?: unknown[];
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.error || 'Dështoi ngarkimi i produkteve nga API',
          message: data.message,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ items: data.items ?? [] });
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
