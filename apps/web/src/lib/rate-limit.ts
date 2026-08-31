import { prisma } from './prisma';
import { hashIp } from './security';

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

function rateLimitKey(scope: string, ip: string): string {
  return hashIp(`${scope}:${ip}`);
}

export async function peekRateLimit(
  scope: string,
  ip: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = rateLimitKey(scope, ip);
  const now = Date.now();

  const record = await prisma.failedAttempt.findUnique({
    where: { ip: key },
  });

  if (record?.blockedAt && now - record.blockedAt.getTime() < windowMs) {
    return { success: false, remaining: 0 };
  }

  if (!record) {
    return { success: true, remaining: maxAttempts };
  }

  if (record.blockedAt && now - record.blockedAt.getTime() >= windowMs) {
    return { success: true, remaining: maxAttempts };
  }

  const remaining = Math.max(0, maxAttempts - record.attempts);
  return { success: remaining > 0, remaining };
}

export async function bumpRateLimit(
  scope: string,
  ip: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = rateLimitKey(scope, ip);
  const now = Date.now();

  const record = await prisma.failedAttempt.findUnique({
    where: { ip: key },
  });

  if (record?.blockedAt && now - record.blockedAt.getTime() < windowMs) {
    return { success: false, remaining: 0 };
  }

  if (!record) {
    await prisma.failedAttempt.create({
      data: { ip: key, attempts: 1 },
    });
    return { success: true, remaining: maxAttempts - 1 };
  }

  if (record.blockedAt && now - record.blockedAt.getTime() >= windowMs) {
    await prisma.failedAttempt.update({
      where: { ip: key },
      data: { attempts: 1, blockedAt: null },
    });
    return { success: true, remaining: maxAttempts - 1 };
  }

  const newAttempts = record.attempts + 1;

  if (newAttempts > maxAttempts) {
    await prisma.failedAttempt.update({
      where: { ip: key },
      data: { attempts: newAttempts, blockedAt: new Date() },
    });
    return { success: false, remaining: 0 };
  }

  await prisma.failedAttempt.update({
    where: { ip: key },
    data: { attempts: newAttempts },
  });

  return { success: true, remaining: maxAttempts - newAttempts };
}

/** @deprecated Prefer peekRateLimit + bumpRateLimit for clearer success/failure handling */
export async function checkRateLimit(
  scope: string,
  ip: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  return bumpRateLimit(scope, ip, maxAttempts, windowMs);
}

export async function resetRateLimit(scope: string, ip: string): Promise<void> {
  const key = rateLimitKey(scope, ip);
  await prisma.failedAttempt.delete({ where: { ip: key } }).catch(() => {});
}

export function registerRateLimitConfig(): { maxAttempts: number; windowMs: number } {
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    maxAttempts: isDev ? 20 : 5,
    windowMs: isDev ? 15 * 60 * 1000 : 60 * 60 * 1000,
  };
}
