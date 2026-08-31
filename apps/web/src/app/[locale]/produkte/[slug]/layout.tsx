import { serverFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { ProductDTO } from '@swisswall/types';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { ProductJsonLd } from '@/components/seo/ProductJsonLd';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const data = await serverFetch<{ product: ProductDTO }>(`/api/products/${slug}`);

  if (data?.product) {
    const product = data.product;
    const name =
      product.nameJson[locale as keyof typeof product.nameJson] || product.nameJson.de;
    const desc =
      product.descJson[locale as keyof typeof product.descJson] || product.descJson.de;
    const image = product.images[0]
      ? resolveMediaUrl(product.images[0].url)
      : '/Enhancing-Wood-Panel-Walls.webp';

    return buildPageMetadata({
      locale,
      pathname: `/produkte/${slug}`,
      title: `${name} | Swiss Wall Panels`,
      description: desc,
      openGraph: {
        title: `${name} | Swiss Wall Panels`,
        description: desc,
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: name }],
      },
    });
  }

  return buildPageMetadata({
    locale,
    pathname: '/produkte',
    title: t('productsTitle'),
    description: t('productsDesc'),
  });
}

export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const data = await serverFetch<{ product: ProductDTO }>(`/api/products/${slug}`);

  return (
    <>
      {data?.product ? <ProductJsonLd product={data.product} locale={locale} /> : null}
      {children}
    </>
  );
}
