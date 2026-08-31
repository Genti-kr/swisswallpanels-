import { isSecretPlaceholder, isStrongSecret } from './secrets';

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const required: Record<string, string | undefined> = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    API_URL: process.env.API_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    POSTMARK_API_KEY: process.env.POSTMARK_API_KEY,
    POSTMARK_FROM: process.env.POSTMARK_FROM,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    CONSENT_LOG_SALT: process.env.CONSENT_LOG_SALT,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !isStrongSecret(value))
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(
      `[FATAL] Production startup blocked — configure these environment variables:\n  ${missing.join('\n  ')}\n\nSee PRODUCTION_SETUP.md for setup instructions.`
    );
    process.exit(1);
  }
}

export function warnDevelopmentEnv(): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const integrations: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    POSTMARK_API_KEY: process.env.POSTMARK_API_KEY,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  };

  for (const [key, value] of Object.entries(integrations)) {
    if (isSecretPlaceholder(value)) {
      console.warn(`[WARN] ${key} is not configured — related features will use dev fallbacks.`);
    }
  }
}
