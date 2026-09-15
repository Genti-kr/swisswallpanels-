const DEV_API_URL = 'http://localhost:3001';
const DEV_FRONTEND_URL = 'http://localhost:3000';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export function getApiUrl(): string {
  const value = process.env.API_URL?.trim();
  if (value) return normalizeUrl(value);
  if (isProduction()) {
    throw new Error('API_URL must be set in production');
  }
  return DEV_API_URL;
}

export function getFrontendUrl(): string {
  const value = process.env.FRONTEND_URL?.trim();
  if (value) return normalizeUrl(value);
  if (isProduction()) {
    throw new Error('FRONTEND_URL must be set in production');
  }
  return DEV_FRONTEND_URL;
}

/** Apex + www (+ optional CORS_ORIGINS) for browser requests from the storefront. */
export function getCorsOrigins(): string[] {
  const origins = new Set<string>();
  const add = (url: string | undefined) => {
    if (!url?.trim()) return;
    origins.add(normalizeUrl(url.trim()));
  };

  add(getFrontendUrl());

  try {
    const base = new URL(getFrontendUrl());
    if (base.hostname.startsWith('www.')) {
      add(`${base.protocol}//${base.hostname.slice(4)}`);
    } else {
      add(`${base.protocol}//www.${base.hostname}`);
    }
  } catch {
    /* ignore invalid FRONTEND_URL */
  }

  const extra = process.env.CORS_ORIGINS?.split(',').map((part) => part.trim()) ?? [];
  for (const origin of extra) add(origin);

  return [...origins];
}

export function frontendPath(path: string): string {
  const base = getFrontendUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
