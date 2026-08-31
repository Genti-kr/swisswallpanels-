import { getTranslations } from 'next-intl/server';
import { DashboardShell } from '@/components/DashboardShell';
import { buildPageMetadata, NOINDEX_ROBOTS } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return buildPageMetadata({
    locale,
    pathname: '/dashboard',
    title: t('dashboardTitle'),
    description: t('dashboardDesc'),
    robots: NOINDEX_ROBOTS,
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
