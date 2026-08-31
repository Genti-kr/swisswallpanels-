import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { createApiToken } from '@/lib/api-token';

import { getInternalApiUrl } from '@/lib/urls';

const API_URL = getInternalApiUrl();

async function forwardMultipart(
  req: NextRequest,
  targetUrl: string,
  token: string
) {
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const body = await req.arrayBuffer();

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error || 'Image upload failed' },
      { status: res.status }
    );
  }

  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const adminUser = await getAdminSessionUser(session);

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const token = createApiToken(adminUser);
    return await forwardMultipart(
      req,
      `${API_URL}/api/admin/products/${id}/images`,
      token
    );
  } catch (err) {
    console.error('Image upload error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'API serveri nuk është i arritshëm. Sigurohu që Express API po ekzekutohet në port 3001.',
      },
      { status: 503 }
    );
  }
}
