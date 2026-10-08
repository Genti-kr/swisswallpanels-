import { getInternalApiUrl } from '@/lib/urls';
import { createApiToken } from '@/lib/api-token';
import type { AdminSessionUser } from '@/lib/admin-session';

/** Server-side call from Vercel → Hetzner Express API with admin JWT. */
export async function fetchInternalApiAsAdmin(
  admin: AdminSessionUser,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = createApiToken(admin);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${getInternalApiUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
