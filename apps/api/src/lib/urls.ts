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

export function frontendPath(path: string): string {
  const base = getFrontendUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
