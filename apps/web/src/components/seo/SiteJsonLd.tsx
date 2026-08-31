import { getPublicSiteUrl } from '@/lib/urls';
import { SITE_NAME } from '@/lib/seo';
import { JsonLd } from './JsonLd';

export function SiteJsonLd({ locale }: { locale: string }) {
  const siteUrl = getPublicSiteUrl();

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/Enhancing-Wood-Panel-Walls.webp`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@swisswallpanels.ch',
      availableLanguage: ['German', 'French', 'English', 'Albanian'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CH',
    },
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${siteUrl}/${locale}`,
    inLanguage: locale,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };

  return <JsonLd data={[organization, website]} />;
}
