import { getInternalApiUrl } from '@/lib/urls';

const NEXTJS_ONLY_ROUTES = [
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/unlock-account',
];

function isNextJsOnlyRoute(path: string): boolean {
  return NEXTJS_ONLY_ROUTES.some((p) => path === p || path.startsWith(`${p}/`));
}

function isMultipartUploadRoute(path: string): boolean {
  return (
    (path.startsWith('/api/admin/products/') && path.endsWith('/images')) ||
    path === '/api/admin/site/images'
  );
}

function resolveApiUrl(path: string, method = 'GET'): string {
  if (typeof window !== 'undefined' && path.startsWith('/api/')) {
    if (isNextJsOnlyRoute(path)) {
      return path;
    }
    if (method === 'POST' && isMultipartUploadRoute(path)) {
      return path;
    }
    return `/api/backend${path.slice(4)}`;
  }
  return `${getInternalApiUrl()}${path}`;
}

export function getCartSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cartSession');
}

export function setCartSession(sessionId: string) {
  localStorage.setItem('cartSession', sessionId);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cartSession = getCartSession();
  const method = options.method || 'GET';

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (cartSession) {
    headers['X-Cart-Session'] = cartSession;
  }

  const url = resolveApiUrl(path, method);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new Error(
      'Lidhja me serverin dështoi. Sigurohu që API po ekzekutohet: cd apps/api && npm run dev'
    );
  }

  const newSession = res.headers.get('X-Cart-Session');
  if (newSession) {
    setCartSession(newSession);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }

  return data as T;
}

export async function serverFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getInternalApiUrl()}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
