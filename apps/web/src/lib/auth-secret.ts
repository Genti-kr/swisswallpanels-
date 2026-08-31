function isWeakAuthSecret(value: string | undefined): boolean {
  if (!value || value.trim().length < 32) return true;
  const lower = value.toLowerCase();
  const patterns = [
    'your-',
    'change-me',
    'placeholder',
    '256-bit',
    'dev-only',
    'jwt-secret-key',
  ];
  return patterns.some((pattern) => lower.includes(pattern));
}

function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (secret && !isWeakAuthSecret(secret)) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET is required in production (min 32 chars, cryptographically random). Run: pnpm generate:secrets -- --write'
    );
  }

  if (secret && isWeakAuthSecret(secret)) {
    console.warn('[WARN] AUTH_SECRET is weak — run: pnpm generate:secrets -- --write');
  }

  return 'dev-only-auth-secret-change-before-production-min-32-chars';
}

export const authSecret = getAuthSecret();
