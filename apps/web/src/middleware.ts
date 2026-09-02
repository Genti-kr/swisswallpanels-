import createMiddleware from 'next-intl/middleware';
import { buildCspConnectSrc, getCdnHostname } from './lib/urls';
import { isMaintenanceBypassPath, isMaintenanceModeEnabled } from './lib/maintenance';
import { routing } from './i18n/routing';
import { auth } from './lib/auth-middleware';
import { NextResponse } from 'next/server';
import { isAdminRole } from './lib/user-mapper';

const intlMiddleware = createMiddleware(routing);

/** Public assets in apps/web/public — must not get a locale prefix (/de/...). */
const STATIC_PUBLIC_FILE = /\.(webp|jpg|jpeg|png|gif|svg|ico)$/i;

function isStaticPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/catalogs/') ||
    STATIC_PUBLIC_FILE.test(pathname)
  );
}

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  // Admin routes live outside [locale] — fix /en/admin → /admin
  const localeAdminMatch = pathname.match(/^\/([a-z]{2})\/admin(\/.*)?$/);
  if (localeAdminMatch) {
    const adminPath = `/admin${localeAdminMatch[2] || ''}`;
    return NextResponse.redirect(new URL(adminPath, req.url));
  }

  // Static public files — skip locale middleware (/uploads/*, /catalogs/*, *.webp, etc.)
  if (pathname.startsWith('/uploads/') || isStaticPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'de';
  const cleanPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');

  // Locale-prefixed upload paths → rewrite internally to /uploads/*
  const localeUploadMatch = pathname.match(/^\/[a-z]{2}\/uploads\/(.+)$/);
  if (localeUploadMatch) {
    return NextResponse.rewrite(new URL(`/uploads/${localeUploadMatch[1]}`, req.url));
  }


  // Maintenance mode — env MAINTENANCE_MODE=true (admin + API bypass)
  if (isMaintenanceModeEnabled() && !isMaintenanceBypassPath(pathname)) {
    const maintenanceLocale = localeMatch ? localeMatch[1] : 'de';
    if (cleanPath !== '/maintenance') {
      return NextResponse.redirect(new URL(`/${maintenanceLocale}/maintenance`, req.url));
    }
  }

  const isAdminLogin = pathname === '/admin/login';
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminRoute = isAdminPath && !isAdminLogin;
  const isUserRoute = ['/dashboard', '/profile', '/orders', '/konto'].some(
    (r) => cleanPath.startsWith(r)
  );
  const isAuthRoute = ['/login', '/register'].some((r) => cleanPath.startsWith(r));

  if (!isLoggedIn && (isAdminRoute || isUserRoute)) {
    if (isAdminRoute) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAdminRoute && !isAdminRole(role)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  if (isLoggedIn && isUserRoute && isAdminRole(role)) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    if (isAdminRole(role)) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  if (isLoggedIn && isAdminLogin && isAdminRole(role)) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  if (searchParams.get('error') === 'SessionExpired') {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set('expired', '1');
    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) {
      loginUrl.searchParams.set('callbackUrl', callbackUrl);
    }
    return NextResponse.redirect(loginUrl);
  }

  const isApi = cleanPath.startsWith('/api');
  let response = NextResponse.next();
  if (!isApi && !isAdminPath) {
    response = intlMiddleware(req);
  }

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

  const cdnHost = getCdnHostname();
  const imgSrc = cdnHost
    ? `'self' data: blob: https: https://*.stripe.com https://${cdnHost}`
    : "'self' data: blob: https: https://*.stripe.com";

  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src ${imgSrc}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${buildCspConnectSrc()}`,
    "frame-src 'self' https://js.stripe.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', cspHeader);

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  if (isAdminRoute || isUserRoute) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|uploads|catalogs|.*\\.(?:webp|jpg|jpeg|png|gif|svg|ico)).*)',
  ],
};
