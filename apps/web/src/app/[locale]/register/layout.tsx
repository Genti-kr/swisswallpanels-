import { getTranslations } from 'next-intl/server';
import { buildPageMetadata, NOINDEX_ROBOTS } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return buildPageMetadata({
    locale,
    pathname: '/register',
    title: t('registerTitle'),
    description: t('registerDesc'),
    robots: NOINDEX_ROBOTS,
  });
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
