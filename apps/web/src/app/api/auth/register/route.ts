import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/auth-schemas';
import { sanitizeFields } from '@/lib/sanitize';
import { createAuditLog } from '@/lib/audit';
import { peekRateLimit, bumpRateLimit, resetRateLimit, registerRateLimitConfig } from '@/lib/rate-limit';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { authEmailService, buildVerifyUrl, isEmailConfigured } from '@/lib/auth-email';
import { mapUser } from '@/lib/user-mapper';

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const { maxAttempts, windowMs } = registerRateLimitConfig();
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev) {
    const { success: allowed } = await peekRateLimit('register', ip, maxAttempts, windowMs);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Shumë përpjekje. Provo përsëri pas 1 ore.' },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      if (!isDev) await bumpRateLimit('register', ip, maxAttempts, windowMs);
      const firstError = parsed.error.errors[0]?.message || 'Të dhëna të pavlefshme';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const sanitized = sanitizeFields(parsed.data, [
      'email',
      'firstName',
      'lastName',
      'phone',
      'companyName',
      'vatNumber',
    ]);

    const existingUser = await prisma.user.findUnique({
      where: { email: sanitized.email },
    });

    if (existingUser) {
      if (!isDev) await bumpRateLimit('register', ip, maxAttempts, windowMs);
      return NextResponse.json(
        { error: 'Ky email është i regjistruar tashmë' },
        { status: 409 }
      );
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(sanitized.password, saltRounds);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: sanitized.email,
        passwordHash,
        firstName: sanitized.firstName,
        lastName: sanitized.lastName,
        phone: sanitized.phone || null,
        companyName: sanitized.companyName || null,
        vatNumber: sanitized.vatNumber || null,
        preferredLanguage: sanitized.preferredLanguage,
        role: 'USER',
        emailVerified: false,
        emailVerifyToken: hashedVerifyToken,
        emailVerifyExpires,
      },
    });

    await prisma.cart.create({ data: { userId: user.id } });
    await prisma.wishlist.create({ data: { userId: user.id } });

    await authEmailService.sendEmailVerification(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      verifyToken,
      user.preferredLanguage.toLowerCase()
    );

    await createAuditLog('REGISTER', user.id, ip, userAgent);
    await resetRateLimit('register', ip);

    const payload: {
      user: ReturnType<typeof mapUser>;
      message: string;
      devVerifyUrl?: string;
    } = {
      user: mapUser(user),
      message:
        'Regjistrimi u krye me sukses. Ju lutemi kontrolloni email-in për të verifikuar llogarinë tuaj.',
    };

    if (!isEmailConfigured()) {
      payload.devVerifyUrl = buildVerifyUrl(
        verifyToken,
        user.preferredLanguage.toLowerCase()
      );
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (!isDev) await bumpRateLimit('register', ip, maxAttempts, windowMs).catch(() => {});
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email ose fjalëkalim i pasaktë' },
        { status: 400 }
      );
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
