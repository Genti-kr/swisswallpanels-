import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('verifyEmailTitle'),
    description: t('verifyEmailDesc'),
  };
}

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
