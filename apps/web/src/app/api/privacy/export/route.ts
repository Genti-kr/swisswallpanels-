import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrigin } from '@/lib/security';

export async function GET(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      companyName: true,
      vatNumber: true,
      role: true,
      preferredLanguage: true,
      newsletterOptIn: true,
      emailVerified: true,
      country: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [addresses, orders, wishlist] = await Promise.all([
    prisma.address.findMany({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.wishlist.findUnique({
      where: { userId },
      include: { items: { include: { product: { select: { slug: true, sku: true } } } } },
    }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user,
    addresses,
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalChf: Number(order.totalChf),
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        totalChf: Number(item.totalChf),
      })),
    })),
    wishlist: wishlist?.items.map((item) => ({
      productSlug: item.product.slug,
      productSku: item.product.sku,
      addedAt: item.addedAt,
    })),
  });
}
