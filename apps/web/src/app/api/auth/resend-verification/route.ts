import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resendVerificationSchema } from '@/lib/auth-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { authEmailService, buildVerifyUrl, isEmailConfigured } from '@/lib/auth-email';

const GENERIC_MESSAGE =
  'Nëse email-i është i regjistruar dhe ende i paverifikuar, një link i ri është dërguar.';

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);

  const { success } = await checkRateLimit('resend-verify', ip, 3, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json(
      { error: 'Shumë përpjekje. Provo përsëri pas 1 ore.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = resendVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user || user.emailVerified) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashedVerifyToken,
        emailVerifyExpires,
      },
    });

    await authEmailService.sendEmailVerification(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      verifyToken,
      parsed.data.locale
    );

    const payload: { message: string; devVerifyUrl?: string } = {
      message: GENERIC_MESSAGE,
    };

    if (!isEmailConfigured()) {
      payload.devVerifyUrl = buildVerifyUrl(verifyToken, parsed.data.locale);
    }

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }
    console.error('Resend verification error:', error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
