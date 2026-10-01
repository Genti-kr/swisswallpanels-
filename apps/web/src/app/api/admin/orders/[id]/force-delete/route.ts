import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { deleteOrderFromDb, isForcePaidDeleteEnabled } from '@/lib/order-delete';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (admin.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'SUPERADMIN required' }, { status: 403 });
  }
  if (!isForcePaidDeleteEnabled()) {
    return NextResponse.json(
      {
        error: 'FORCE_DELETE_DISABLED',
        message: 'Set ALLOW_DELETE_PAID_ORDERS=true (Vercel env) for test-order cleanup.',
      },
      { status: 403 }
    );
  }

  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: 'Order id required' }, { status: 400 });
  }

  try {
    await deleteOrderFromDb(orderId, { forcePaid: true });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 404) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    console.error('admin order force-delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
