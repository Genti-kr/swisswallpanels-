import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { resolveCategoryIdByName } from '@/lib/resolve-category';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const admin = await getAdminSessionUser(session);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as { name?: string };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Kategoria është e detyrueshme' }, { status: 400 });
    }

    const categoryId = await resolveCategoryIdByName(name);
    return NextResponse.json({ categoryId });
  } catch (error) {
    if (error instanceof Error && error.message === 'CATEGORY_REQUIRED') {
      return NextResponse.json({ error: 'Kategoria është e detyrueshme' }, { status: 400 });
    }
    console.error('ensure-category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
