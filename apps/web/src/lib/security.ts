import crypto from 'crypto';

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

import { getAllowedOrigins } from './urls';

export function verifyOrigin(request: Request): boolean {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    console.warn('verifyOrigin: no allowed origins configured');
    return process.env.NODE_ENV !== 'production';
  }

  const origin = request.headers.get('origin');
  if (origin) {
    const normalized = origin.replace(/\/$/, '');
    return allowed.some((a) => a === normalized);
  }

  const referer = request.headers.get('referer');
  if (referer) {
    return allowed.some((a) => referer.startsWith(a));
  }

  return true;
}

export function forbiddenResponse(): Response {
  return new Response('Forbidden', { status: 403 });
}

export function unauthorizedResponse(): Response {
  return new Response('Unauthorized', { status: 401 });
}
