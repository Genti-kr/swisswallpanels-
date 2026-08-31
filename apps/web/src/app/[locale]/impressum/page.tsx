import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function ImpressumPage() {
  const t = useTranslations('Legal');
  const tCommon = useTranslations('Common');

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white border border-zinc-200/80 rounded-xl p-8 shadow-sm space-y-6">
        <h1 className="text-3xl font-light tracking-tight border-b pb-4">{t('impressumTitle')}</h1>
        {t('imprintDisclaimer') ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t('imprintDisclaimer')}
          </div>
        ) : null}
        <p className="text-sm text-zinc-600 font-light leading-relaxed">
          {t('imprintIntro')}
        </p>
        <div className="space-y-4 text-sm font-light leading-relaxed text-zinc-700">
          <section className="space-y-1">
            <h2 className="text-lg font-medium text-black">{t('imprintSec1Title')}</h2>
            {t('imprintSec1Text').split('\n').map((line, index) => (
              <p key={index} className={index === 0 ? "font-medium text-[#1A1A1A]" : ""}>{line}</p>
            ))}
          </section>
          <section className="space-y-1">
            <h2 className="text-lg font-medium text-black">{t('imprintSec2Title')}</h2>
            {t('imprintSec2Text').split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </section>
          <section className="space-y-1">
            <h2 className="text-lg font-medium text-black">{t('imprintSec3Title')}</h2>
            {t('imprintSec3Text').split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </section>
          <section className="space-y-1">
            <h2 className="text-lg font-medium text-black">{t('imprintSec4Title')}</h2>
            {t('imprintSec4Text').split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
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
