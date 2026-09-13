import { MetadataRoute } from 'next';
import { getInternalApiUrl, getPublicSiteUrl, isLocalApiUrl } from '@/lib/urls';

const LOCALES = ['de', 'fr', 'en', 'sq'] as const;

const PUBLIC_ROUTES = [
  '',
  '/produkte',
  '/katalog',
  '/agb',
  '/widerruf',
  '/datenschutz',
  '/impressum',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicSiteUrl();
  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1.0 : route === '/produkte' || route === '/katalog' ? 0.9 : 0.7,
      });
    }
  }

  const apiUrl =
    process.env.INTERNAL_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!isLocalApiUrl(apiUrl)) {
    try {
      const res = await fetch(`${getInternalApiUrl()}/api/products`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = (await res.json()) as { items: { slug: string }[] };
        for (const locale of LOCALES) {
          for (const product of data.items ?? []) {
            sitemapEntries.push({
              url: `${baseUrl}/${locale}/produkte/${product.slug}`,
              changeFrequency: 'weekly',
              priority: 0.6,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Sitemap: skipping product URLs (API unreachable during build)', e);
    }
  }

  return sitemapEntries;
}
