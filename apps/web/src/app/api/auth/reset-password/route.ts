import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/auth-schemas';
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
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email ose fjalëkalim i pasaktë' },
        { status: 400 }
      );
    }

    const hashedResetToken = crypto
      .createHash('sha256')
      .update(parsed.data.token)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token i rivendosjes së fjalëkalimit është i pasaktë ose ka skaduar.' },
        { status: 400 }
      );
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(parsed.data.password, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await createAuditLog('PASSWORD_RESET_SUCCESS', user.id, ip, userAgent);

    return NextResponse.json({
      message: 'Fjalëkalimi u rivendos me sukses. Tani mund të hyni me fjalëkalimin e ri.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email ose fjalëkalim i pasaktë' },
        { status: 400 }
      );
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
