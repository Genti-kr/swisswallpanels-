const PLACEHOLDER_PATTERNS = [
  '...',
  'placeholder',
  'your-',
  'change-me',
  'dev-invoice-secret',
  'dev-only-auth',
  'dev-only',
  '256-bit-jwt',
  '256-bit-secret',
  'swp-consent',
  'sk_test_...',
  'whsec_...',
  'pk_test_...',
];

const MIN_SECRET_LENGTH = 32;

export function isSecretPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim() === '') return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function isStrongSecret(value: string | undefined): boolean {
  if (!value || value.trim().length < MIN_SECRET_LENGTH) return false;
  return !isSecretPlaceholder(value);
}

export function getRequiredSecret(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value && isStrongSecret(value)) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    if (!value || !value.trim()) {
      throw new Error(`${name} is required in production`);
    }
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters and not a placeholder value`
    );
  }

  if (value && !isStrongSecret(value)) {
    console.warn(`[WARN] ${name} is weak or looks like a placeholder — generate with: pnpm generate:secrets`);
  }

  if (devFallback) {
    console.warn(`[WARN] ${name} is not configured — using development fallback`);
    return devFallback;
  }

  throw new Error(`${name} is required`);
}

export function getInvoiceSigningSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (secret && !isSecretPlaceholder(secret)) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET or AUTH_SECRET is required for invoice access tokens');
  }

  return 'dev-invoice-secret';
}

export function getConsentLogSalt(): string {
  return getRequiredSecret('CONSENT_LOG_SALT', 'swp-consent-dev-only');
}
