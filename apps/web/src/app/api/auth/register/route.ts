import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/auth-schemas';
import { sanitizeFields } from '@/lib/sanitize';
import { createAuditLog } from '@/lib/audit';
import { peekRateLimit, bumpRateLimit, resetRateLimit, registerRateLimitConfig } from '@/lib/rate-limit';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { authEmailService, buildVerifyUrl, isEmailConfigured } from '@/lib/auth-email';
import { mapUser } from '@/lib/user-mapper';
import { getInternalApiUrl, isLocalApiUrl } from '@/lib/urls';

async function proxyRegisterToApi(body: string): Promise<Response> {
  const apiUrl = getInternalApiUrl();
  const upstream = await fetch(`${apiUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { error: text || `Upstream error (${upstream.status})` };
  }

  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const { maxAttempts, windowMs } = registerRateLimitConfig();
  const isDev = process.env.NODE_ENV !== 'production';

  const rawBody = await request.text();

  const apiUrl = getInternalApiUrl();
  if (!isDev && !isLocalApiUrl(apiUrl)) {
    return proxyRegisterToApi(rawBody);
  }

  if (!isDev) {
    try {
      const { success: allowed } = await peekRateLimit('register', ip, maxAttempts, windowMs);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Shumë përpjekje. Provo përsëri pas 1 ore.' },
          { status: 429 }
        );
      }
    } catch (rateErr) {
      console.warn('Register rate-limit check skipped:', rateErr);
    }
  }

  try {
    const body = rawBody ? JSON.parse(rawBody) : {};
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      if (!isDev) await bumpRateLimit('register', ip, maxAttempts, windowMs).catch(() => {});
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
      if (!isDev) await bumpRateLimit('register', ip, maxAttempts, windowMs).catch(() => {});
      return NextResponse.json(
        { error: 'Ky email është i regjistruar tashmë' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(sanitized.password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
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
      await tx.cart.create({ data: { userId: created.id } });
      await tx.wishlist.create({ data: { userId: created.id } });
      return created;
    });

    await authEmailService
      .sendEmailVerification(
        { firstName: user.firstName, lastName: user.lastName, email: user.email },
        verifyToken,
        user.preferredLanguage.toLowerCase()
      )
      .catch((err) => console.error('Register: verification email failed:', err));

    await createAuditLog('REGISTER', user.id, ip, userAgent).catch((err) =>
      console.error('Register: audit log failed:', err)
    );
    await resetRateLimit('register', ip).catch(() => {});

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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ky email është i regjistruar tashmë' }, { status: 409 });
      }
    }
    console.error('Register error:', error);
    const dbHint =
      process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL
        ? 'DATABASE_URL mungon në Vercel.'
        : 'Internal server error';
    return NextResponse.json({ error: dbHint }, { status: 500 });
  }
}
