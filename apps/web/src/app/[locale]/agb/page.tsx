import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function AGBPage() {
  const t = useTranslations('Legal');
  const tCommon = useTranslations('Common');
  
  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white border border-zinc-200/80 rounded-xl p-8 shadow-sm space-y-6">
        <h1 className="text-3xl font-light tracking-tight border-b pb-4">{t('agbTitle')}</h1>
        <p className="text-sm text-zinc-600 font-light leading-relaxed">
          {t('agbIntro')}
        </p>
        <div className="space-y-4 text-sm font-light leading-relaxed text-zinc-700">
          <section className="space-y-2">
            <h2 className="text-lg font-medium text-black">{t('agbSec1Title')}</h2>
            <p>{t('agbSec1Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-medium text-black">{t('agbSec2Title')}</h2>
            <p>{t('agbSec2Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-medium text-black">{t('agbSec3Title')}</h2>
            <p>{t('agbSec3Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-medium text-black">{t('agbSec4Title')}</h2>
            <p>{t('agbSec4Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-medium text-black">{t('agbSec5Title')}</h2>
            <p>{t('agbSec5Text')}</p>
          </section>
        </div>
        <div className="pt-6 border-t">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-[#C8B89A] hover:underline"
          >
            ← {tCommon('back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
