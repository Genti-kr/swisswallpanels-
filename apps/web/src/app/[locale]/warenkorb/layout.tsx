import { getTranslations } from 'next-intl/server';
import { buildPageMetadata, NOINDEX_ROBOTS } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return buildPageMetadata({
    locale,
    pathname: '/warenkorb',
    title: t('cartTitle'),
    description: t('cartDesc'),
    robots: NOINDEX_ROBOTS,
  });
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
