import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('privacyTitle'),
    description: t('privacyDesc'),
  };
}

export default function DatenschutzLayout({ children }: { children: React.ReactNode }) {
  return children;
}
