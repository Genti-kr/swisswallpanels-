import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Errors' });
  return {
    title: t('maintenanceTitle'),
    robots: { index: false, follow: false },
  };
}

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
