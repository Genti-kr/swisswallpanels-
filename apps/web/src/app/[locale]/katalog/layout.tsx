import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Catalog' });
  return buildPageMetadata({
    locale,
    pathname: '/katalog',
    title: t('metaTitle'),
    description: t('metaDesc'),
  });
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
