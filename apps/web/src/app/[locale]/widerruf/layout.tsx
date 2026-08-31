import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('widerrufTitle'),
    description: t('widerrufDesc'),
  };
}

export default function WiderrufLayout({ children }: { children: React.ReactNode }) {
  return children;
}
