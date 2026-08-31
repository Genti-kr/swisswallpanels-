const DEV_INTERNAL_API = 'http://localhost:3001';
const DEV_SITE_URL = 'http://localhost:3000';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** Server-side API URL (Next.js → Express). Prefer INTERNAL_API_URL in production. */
export function getInternalApiUrl(): string {
  const value =
    process.env.INTERNAL_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (value) return normalizeUrl(value);
  if (isProduction()) {
    throw new Error('INTERNAL_API_URL or NEXT_PUBLIC_API_URL must be set in production');
  }
  return DEV_INTERNAL_API;
}

/** Public storefront URL for metadata, sitemap, emails. */
export function getPublicSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (value) return normalizeUrl(value);
  if (isProduction()) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set in production');
  }
  return DEV_SITE_URL;
}

/** Origin used for CSRF/origin checks on auth routes. */
export function getAllowedOrigin(): string {
  const value =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (value) return normalizeUrl(value);
  if (isProduction()) {
    throw new Error('NEXTAUTH_URL, FRONTEND_URL, or NEXT_PUBLIC_SITE_URL must be set in production');
  }
  return DEV_SITE_URL;
}

export function buildCspConnectSrc(): string {
  const parts = ["'self'", 'https://api.stripe.com'];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (apiUrl) parts.push(apiUrl);
  if (siteUrl) parts.push(siteUrl);

  if (!isProduction()) {
    parts.push('http://localhost:3001', 'ws://localhost:*');
  }

  return parts.join(' ');
}

export function getCdnHostname(): string | null {
  const cdn = process.env.NEXT_PUBLIC_CDN_HOSTNAME?.trim();
  if (cdn) return cdn.replace(/^https?:\/\//, '').split('/')[0];

  const r2Public = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (r2Public) {
    try {
      return new URL(r2Public).hostname;
    } catch {
      return null;
    }
  }

  return isProduction() ? 'cdn.swisswallpanels.ch' : null;
}
