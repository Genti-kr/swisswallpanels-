import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { createApiToken } from '@/lib/api-token';

export async function GET() {
  const session = await auth();
  const adminUser = await getAdminSessionUser(session);

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, '') ||
    process.env.INTERNAL_API_URL?.trim()?.replace(/\/$/, '');

  if (!apiBase) {
    return NextResponse.json({ error: 'API URL not configured' }, { status: 500 });
  }

  return NextResponse.json({
    token: createApiToken(adminUser),
    apiBase,
  });
}
