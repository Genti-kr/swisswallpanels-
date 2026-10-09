import { NextResponse } from 'next/server';
import {
  resolveProductionApiUrl,
  shouldAuthenticateViaApi,
} from '@/lib/auth-login-via-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hasAuthSecretConfigured(): boolean {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export async function GET() {
  const apiUrl = resolveProductionApiUrl();
  let apiHealth: { ok: boolean; status?: number; db?: string } = { ok: false };

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as { db?: string };
      apiHealth = { ok: res.ok, status: res.status, db: data.db };
    } catch {
      apiHealth = { ok: false };
    }
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    hasAuthSecret: hasAuthSecretConfigured(),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL?.trim()),
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() ?? null,
    hasInternalApiUrl: Boolean(process.env.INTERNAL_API_URL?.trim()),
    hasPublicApiUrl: Boolean(process.env.NEXT_PUBLIC_API_URL?.trim()),
    resolvedApiUrl: apiUrl,
    loginViaApi: shouldAuthenticateViaApi(),
    skipEmailVerification:
      process.env.AUTH_SKIP_EMAIL_VERIFICATION?.trim().toLowerCase() === 'true' ||
      process.env.AUTH_SKIP_EMAIL_VERIFICATION?.trim() === '1',
    apiHealth,
  });
}
