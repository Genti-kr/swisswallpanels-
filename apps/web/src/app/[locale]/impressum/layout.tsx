import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('imprintTitle'),
    description: t('imprintDesc'),
  };
}

export default function ImpressumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
