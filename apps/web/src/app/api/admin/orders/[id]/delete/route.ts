import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { deleteUnpaidOrderFromDb } from '@/lib/order-delete';

type RouteContext = { params: Promise<{ id: string }> };

async function handleDelete(_req: NextRequest, orderId: string) {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!orderId?.trim()) {
    return NextResponse.json({ error: 'Order id required' }, { status: 400 });
  }

  try {
    await deleteUnpaidOrderFromDb(orderId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 404) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (err.statusCode === 409 || err.message === 'ORDER_PAID') {
      return NextResponse.json(
        {
          error: 'ORDER_PAID',
          message: 'Paid orders cannot be deleted.',
        },
        { status: 409 }
      );
    }
    console.error('admin order delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return handleDelete(_req, id);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return handleDelete(_req, id);
}
