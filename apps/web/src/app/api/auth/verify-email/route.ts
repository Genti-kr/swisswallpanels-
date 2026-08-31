import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyEmailSchema } from '@/lib/auth-schemas';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { mapUser } from '@/lib/user-mapper';

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  try {
    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Token verifikimi i pavlefshëm ose i skaduar.' },
        { status: 400 }
      );
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(parsed.data.token)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashedToken,
        emailVerifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token verifikimi i pavlefshëm ose i skaduar.' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    await createAuditLog('EMAIL_VERIFIED', user.id, ip, userAgent);

    return NextResponse.json({
      message: 'Email u verifikua me sukses.',
      user: mapUser(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Token verifikimi i pavlefshëm ose i skaduar.' },
        { status: 400 }
      );
    }
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
