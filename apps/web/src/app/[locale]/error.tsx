'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Errors');

  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] flex items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white border border-zinc-200/80 rounded-2xl p-10 shadow-sm text-center space-y-5">
        <h1 className="text-2xl font-light tracking-tight">{t('errorTitle')}</h1>
        <p className="text-sm text-zinc-600 font-light leading-relaxed">{t('errorDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-block bg-[#1A1A1A] text-white px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition"
          >
            {t('tryAgain')}
          </button>
          <Link
            href="/"
            className="inline-block border border-zinc-300 px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 transition"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
