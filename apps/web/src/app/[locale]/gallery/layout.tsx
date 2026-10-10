import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return buildPageMetadata({
    locale,
    pathname: '/gallery',
    title: t('galleryTitle'),
    description: t('galleryDesc'),
  });
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
