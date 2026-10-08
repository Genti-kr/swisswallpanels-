import { NextResponse } from 'next/server';
import type { AdminSessionUser } from '@/lib/admin-session';
import { fetchInternalApiAsAdmin } from '@/lib/fetch-internal-api-as-admin';

export async function proxyAdminApiJson(
  admin: AdminSessionUser,
  apiPath: string,
  init: RequestInit
): Promise<NextResponse> {
  const res = await fetchInternalApiAsAdmin(admin, apiPath, init);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
