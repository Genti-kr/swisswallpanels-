import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const isDev = process.env.NODE_ENV !== 'production';

function getApiUrlForRewrites(): string {
  const value =
    process.env.INTERNAL_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (value) return value.replace(/\/$/, '');
  if (!isDev) {
    throw new Error('INTERNAL_API_URL or NEXT_PUBLIC_API_URL is required for production builds');
  }
  return 'http://localhost:3001';
}

function getCdnHostname(): string | null {
  const cdn = process.env.NEXT_PUBLIC_CDN_HOSTNAME?.trim();
  if (cdn) return cdn.replace(/^https?:\/\//, '').split('/')[0];
  const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (r2) {
    try {
      return new URL(r2).hostname;
    } catch {
      return null;
    }
  }
  return isDev ? null : 'cdn.swisswallpanels.ch';
}

function buildCsp(): string {
  const connectSrc = ["'self'", 'https://api.stripe.com'];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (apiUrl) connectSrc.push(apiUrl);
  if (siteUrl) connectSrc.push(siteUrl);
  if (isDev) {
    connectSrc.push('http://localhost:3001', 'ws://localhost:*');
  }
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    connectSrc.push('https://*.ingest.sentry.io');
  }

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

  const cdnHost = getCdnHostname();
  const imgSrc = cdnHost
    ? `'self' data: blob: https: https://*.stripe.com https://${cdnHost}`
    : "'self' data: blob: https: https://*.stripe.com";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src ${imgSrc}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://js.stripe.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: buildCsp() },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  { protocol: 'https', hostname: 'images.unsplash.com' },
];

const cdnHostname = getCdnHostname();
if (cdnHostname) {
  remotePatterns.push({ protocol: 'https', hostname: cdnHostname });
}
if (isDev) {
  remotePatterns.push({ protocol: 'http', hostname: 'localhost', port: '3001' });
}

const nextConfig: NextConfig = {
  transpilePackages: ['@swisswall/types'],
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
  images: {
    remotePatterns,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    const apiUrl = getApiUrlForRewrites();
    return [
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
      {
        source: '/:locale(de|fr|en|sq)/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
