import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mapUser } from '@/lib/user-mapper';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const response = NextResponse.json({ user: mapUser(user) });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
