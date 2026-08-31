import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function NotFoundPage() {
  const t = useTranslations('Errors');

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] flex items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white border border-zinc-200/80 rounded-2xl p-10 shadow-sm text-center space-y-5">
        <p className="text-6xl font-light text-[#C8B89A]">404</p>
        <h1 className="text-2xl font-light tracking-tight">{t('notFoundTitle')}</h1>
        <p className="text-sm text-zinc-600 font-light leading-relaxed">{t('notFoundDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-block bg-[#1A1A1A] text-white px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition"
          >
            {t('backHome')}
          </Link>
          <Link
            href="/produkte"
            className="inline-block border border-zinc-300 px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 transition"
          >
            {t('browseProducts')}
          </Link>
        </div>
      </div>
    </div>
  );
}
