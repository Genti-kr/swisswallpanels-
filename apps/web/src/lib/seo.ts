import { routing } from '@/i18n/routing';
import { getPublicSiteUrl } from '@/lib/urls';

export const SITE_NAME = 'Swiss Wall Panels';

export function buildCanonicalUrl(locale: string, pathname = ''): string {
  const base = getPublicSiteUrl();
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalized = path === '/' ? '' : path;
  return `${base}/${locale}${normalized}`;
}

export function buildAlternateLanguages(pathname = ''): Record<string, string> {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalized = path === '/' ? '' : path;
  const base = getPublicSiteUrl();

  return Object.fromEntries(
    routing.locales.map((locale) => [locale, `${base}/${locale}${normalized}`])
  );
}

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
} as const;

export function buildPageMetadata({
  locale,
  pathname = '',
  title,
  description,
  openGraph,
  robots,
}: {
  locale: string;
  pathname?: string;
  title: string;
  description: string;
  openGraph?: {
    title?: string;
    description?: string;
    images?: { url: string; width?: number; height?: number; alt?: string }[];
    type?: 'website' | 'article';
  };
  robots?: { index: boolean; follow: boolean };
}) {
  const canonical = buildCanonicalUrl(locale, pathname);
  const siteUrl = getPublicSiteUrl();

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: buildAlternateLanguages(pathname),
    },
    openGraph: {
      title: openGraph?.title ?? title,
      description: openGraph?.description ?? description,
      url: canonical,
      siteName: SITE_NAME,
      locale,
      type: openGraph?.type ?? 'website',
      images: openGraph?.images ?? [
        {
          url: `${siteUrl}/Enhancing-Wood-Panel-Walls.webp`,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: openGraph?.title ?? title,
      description: openGraph?.description ?? description,
      images: openGraph?.images?.[0]?.url
        ? [openGraph.images[0].url.startsWith('http') ? openGraph.images[0].url : `${siteUrl}${openGraph.images[0].url}`]
        : [`${siteUrl}/Enhancing-Wood-Panel-Walls.webp`],
    },
    ...(robots ? { robots } : {}),
  };
}
