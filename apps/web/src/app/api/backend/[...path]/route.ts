import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getInternalApiUrl } from '@/lib/urls';
import { auth } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-session';
import { createApiToken } from '@/lib/api-token';

const API_URL = getInternalApiUrl();

const PROTECTED_PREFIXES = ['admin/'];

function isProtectedRoute(pathSegments: string[]): boolean {
  const path = pathSegments.join('/');
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function getProxyUser(session: Session | null) {
  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  const email = session.user.email;
  if (!email) {
    return null;
  }

  return {
    id: session.user.id,
    email,
    role: session.user.role,
  };
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const targetPath = `/api/${pathSegments.join('/')}`;
  const targetUrl = `${API_URL}${targetPath}${req.nextUrl.search}`;

  const session = await auth();
  const adminUser = await getAdminSessionUser(session);

  if (isProtectedRoute(pathSegments) && !adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers = new Headers();

  const contentType = req.headers.get('content-type') || '';

  const proxyUser = adminUser || (await getProxyUser(session));
  if (proxyUser) {
    const token = createApiToken(proxyUser);
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cartSession = req.headers.get('x-cart-session');
  if (cartSession) {
    headers.set('x-cart-session', cartSession);
  }

  let body: BodyInit | undefined;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (contentType.includes('multipart/form-data')) {
      // Preserve raw multipart body + boundary — re-parsing FormData breaks file uploads.
      headers.set('content-type', contentType);
      body = await req.arrayBuffer();
    } else {
      if (contentType) {
        headers.set('content-type', contentType);
      }
      body = await req.arrayBuffer();
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseHeaders = new Headers();
    const cartHeader = res.headers.get('x-cart-session');
    if (cartHeader) {
      responseHeaders.set('x-cart-session', cartHeader);
    }

    const responseContentType = res.headers.get('content-type');
    if (responseContentType) {
      responseHeaders.set('content-type', responseContentType);
    }

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'API serveri nuk është i arritshëm. Sigurohu që Express API po ekzekutohet në port 3001.',
      },
      { status: 503 }
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}
