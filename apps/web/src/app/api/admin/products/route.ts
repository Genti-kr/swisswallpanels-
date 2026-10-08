import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { listAdminCatalog } from '@/lib/admin-products-list';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items, categories } = await listAdminCatalog();
    return NextResponse.json({ items, categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('admin products list error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? undefined : message,
      },
      { status: 500 }
    );
  }
}
