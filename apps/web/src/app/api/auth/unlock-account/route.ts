import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { unlockAccountSchema } from '@/lib/auth-schemas';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, verifyOrigin } from '@/lib/security';

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  try {
    const body = await request.json();
    const parsed = unlockAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Token zhbllokimi i pavlefshëm ose i skaduar.' },
        { status: 400 }
      );
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(parsed.data.token)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        unlockToken: hashedToken,
        unlockTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token zhbllokimi i pavlefshëm ose i skaduar.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isLocked: false,
        failedAttempts: 0,
        unlockToken: null,
        unlockTokenExpires: null,
      },
    });

    await createAuditLog('ACCOUNT_UNLOCKED', user.id, ip, userAgent);

    return NextResponse.json({
      message: 'Llogaria juaj u zhbllokua me sukses. Tani mund të hyni.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Token zhbllokimi i pavlefshëm ose i skaduar.' },
        { status: 400 }
      );
    }
    console.error('Unlock account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
