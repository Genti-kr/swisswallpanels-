import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function MaintenancePage() {
  const t = useTranslations('Errors');

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] flex items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white border border-zinc-200/80 rounded-2xl p-10 shadow-sm text-center space-y-5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8B89A]">
          Swiss Wall Panels
        </div>
        <h1 className="text-2xl font-light tracking-tight">{t('maintenanceTitle')}</h1>
        <p className="text-sm text-zinc-600 font-light leading-relaxed">{t('maintenanceDesc')}</p>
        <p className="text-xs text-zinc-400">{t('maintenanceHint')}</p>
        <Link
          href="/"
          className="inline-block mt-2 text-xs font-semibold uppercase tracking-wider text-[#C8B89A] hover:underline"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
