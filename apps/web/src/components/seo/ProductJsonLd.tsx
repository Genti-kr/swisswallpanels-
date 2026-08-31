import { ProductDTO } from '@swisswall/types';
import { resolveMediaUrl } from '@/lib/media-url';
import { buildCanonicalUrl, SITE_NAME } from '@/lib/seo';
import { getPublicSiteUrl } from '@/lib/urls';
import { JsonLd } from './JsonLd';

export function ProductJsonLd({
  product,
  locale,
}: {
  product: ProductDTO;
  locale: string;
}) {
  const name =
    product.nameJson[locale as keyof typeof product.nameJson] || product.nameJson.de;
  const description =
    product.descJson[locale as keyof typeof product.descJson] || product.descJson.de;
  const image = product.images[0]
    ? resolveMediaUrl(product.images[0].url)
    : '/Enhancing-Wood-Panel-Walls.webp';
  const siteUrl = getPublicSiteUrl();
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: imageUrl,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: buildCanonicalUrl(locale, `/produkte/${product.slug}`),
      priceCurrency: 'CHF',
      price: Number(product.priceChf).toFixed(2),
      availability: product.isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  };

  return <JsonLd data={data} />;
}
