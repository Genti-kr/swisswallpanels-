import { NextResponse } from 'next/server';
import { auth, signOut } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, verifyOrigin } from '@/lib/security';

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const session = await auth();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  await createAuditLog('LOGOUT', session?.user?.id ?? null, ip, userAgent);
  await signOut({ redirect: false });

  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
