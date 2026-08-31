import { getTranslations } from 'next-intl/server';
import HomepageClient from '@/components/HomepageClient';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';

export default async function Homepage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FAQ' });

  const faqItems = [
    { question: t('q1'), answer: t('a1') },
    { question: t('q2'), answer: t('a2') },
    { question: t('q3'), answer: t('a3') },
  ];

  return (
    <>
      <FaqJsonLd items={faqItems} />
      <HomepageClient />
    </>
  );
}
