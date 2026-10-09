import { isLocalApiUrl, tryGetInternalApiUrl } from './urls';

export type ApiLoginUser = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
};

export function resolveProductionApiUrl(): string | null {
  const internal = tryGetInternalApiUrl();
  if (internal && !isLocalApiUrl(internal)) {
    return internal;
  }
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (pub && !isLocalApiUrl(pub)) {
    return pub.replace(/\/$/, '');
  }
  return null;
}

export function shouldAuthenticateViaApi(): boolean {
  return process.env.NODE_ENV === 'production' && Boolean(resolveProductionApiUrl());
}

export async function authenticateViaInternalApi(
  email: string,
  password: string
): Promise<
  | { ok: true; user: ApiLoginUser }
  | { ok: false; status: number; error?: string; code?: string }
> {
  const apiUrl = resolveProductionApiUrl();
  if (!apiUrl) {
    return { ok: false, status: 503, error: 'API URL not configured' };
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('Login API fetch failed:', err);
    return { ok: false, status: 503, error: 'API unreachable' };
  }

  const data = (await res.json().catch(() => ({}))) as {
    user?: ApiLoginUser;
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error,
      code: data.code,
    };
  }

  if (!data.user?.id) {
    return { ok: false, status: 502, error: 'Invalid login response from API' };
  }

  return { ok: true, user: data.user };
}
