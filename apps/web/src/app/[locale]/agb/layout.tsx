import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('agbTitle'),
    description: t('agbDesc'),
  };
}

export default function AGBLayout({ children }: { children: React.ReactNode }) {
  return children;
}
