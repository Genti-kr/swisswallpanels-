import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { createApiToken } from '@/lib/api-token';

import { getInternalApiUrl } from '@/lib/urls';

const API_URL = getInternalApiUrl();

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminUser = await getAdminSessionUser(session);

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
    }

    const body = await req.arrayBuffer();
    const token = createApiToken(adminUser);

    const res = await fetch(`${API_URL}/api/admin/site/images`, {
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
  } catch (err) {
    console.error('Site image upload error:', err);
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
