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

import { getAllowedOrigin } from './urls';

export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const allowedOrigin = getAllowedOrigin();

  if (origin && origin !== allowedOrigin) {
    return false;
  }

  const referer = request.headers.get('referer');
  if (!origin && referer && !referer.startsWith(allowedOrigin)) {
    return false;
  }

  return true;
}

export function forbiddenResponse(): Response {
  return new Response('Forbidden', { status: 403 });
}

export function unauthorizedResponse(): Response {
  return new Response('Unauthorized', { status: 401 });
}
