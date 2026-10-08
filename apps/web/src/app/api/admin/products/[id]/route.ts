import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { proxyAdminApiJson } from '@/lib/proxy-admin-api-json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.text();

  try {
    return await proxyAdminApiJson(admin, `/api/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (error) {
    console.error('admin product PUT proxy error:', error);
    return NextResponse.json(
      { error: 'API serveri nuk është i arritshëm për përditësimin e produktit.' },
      { status: 503 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  const admin = await getAdminSessionUser(session);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    return await proxyAdminApiJson(admin, `/api/admin/products/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('admin product DELETE proxy error:', error);
    return NextResponse.json(
      { error: 'API serveri nuk është i arritshëm për fshirjen e produktit.' },
      { status: 503 }
    );
  }
}
