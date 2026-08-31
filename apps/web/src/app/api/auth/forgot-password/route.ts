import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/auth-schemas';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { authEmailService } from '@/lib/auth-email';
import { peekRateLimit, bumpRateLimit } from '@/lib/rate-limit';

const GENERIC_MESSAGE =
  'Nëse email ekziston, do të marrësh udhëzime.';

const FORGOT_PASSWORD_MAX = 5;
const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const rate = await peekRateLimit('forgot-password', ip, FORGOT_PASSWORD_MAX, FORGOT_PASSWORD_WINDOW_MS);
  if (!rate.success) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      await createAuditLog('PASSWORD_RESET_REQUEST', null, ip, userAgent);
      await bumpRateLimit('forgot-password', ip, FORGOT_PASSWORD_MAX, FORGOT_PASSWORD_WINDOW_MS);
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires,
      },
    });

    await authEmailService.sendPasswordReset(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      resetToken,
      parsed.data.locale
    );

    await createAuditLog('PASSWORD_RESET_REQUEST', user.id, ip, userAgent);

    await bumpRateLimit('forgot-password', ip, FORGOT_PASSWORD_MAX, FORGOT_PASSWORD_WINDOW_MS);

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await bumpRateLimit('forgot-password', ip, FORGOT_PASSWORD_MAX, FORGOT_PASSWORD_WINDOW_MS);
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
