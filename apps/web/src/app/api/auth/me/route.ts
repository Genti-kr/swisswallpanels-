import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mapUser } from '@/lib/user-mapper';
import { shouldAuthenticateViaApi } from '@/lib/auth-login-via-api';
import { skipEmailVerificationForLogin } from '@/lib/auth-login-policy';
import type { UserDTO } from '@swisswall/types';

function userFromSessionToken(session: {
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
    firstName?: string;
    lastName?: string;
  };
}): UserDTO | null {
  const id = session.user?.id;
  const email = session.user?.email;
  const role = (session.user as { role?: UserDTO['role'] })?.role;
  if (!id || !email || !role) return null;

  return {
    id,
    email,
    role,
    firstName: session.user?.firstName ?? '',
    lastName: session.user?.lastName ?? '',
    preferredLanguage: 'DE',
    emailVerified: skipEmailVerificationForLogin(),
    createdAt: new Date(0).toISOString(),
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!shouldAuthenticateViaApi()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (user) {
        const response = NextResponse.json({ user: mapUser(user) });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
      }
    } catch (error) {
      console.warn('auth/me prisma lookup failed:', error);
    }
  }

  const fallback = userFromSessionToken(session);
  if (!fallback) {
    return new Response('Unauthorized', { status: 401 });
  }

  const response = NextResponse.json({ user: fallback });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
