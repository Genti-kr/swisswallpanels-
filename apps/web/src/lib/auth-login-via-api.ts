import { getInternalApiUrl, isLocalApiUrl } from './urls';

export type ApiLoginUser = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
};

export function shouldAuthenticateViaApi(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  try {
    const apiUrl = getInternalApiUrl();
    return Boolean(apiUrl && !isLocalApiUrl(apiUrl));
  } catch {
    return false;
  }
}

export async function authenticateViaInternalApi(
  email: string,
  password: string
): Promise<
  | { ok: true; user: ApiLoginUser }
  | { ok: false; status: number; error?: string; code?: string }
> {
  const apiUrl = getInternalApiUrl();
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

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
