import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { mapProductForAdmin } from '@/lib/admin-product-mapper';

export async function GET() {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        category: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      items: products.map(mapProductForAdmin),
    });
  } catch (error) {
    console.error('admin products list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
