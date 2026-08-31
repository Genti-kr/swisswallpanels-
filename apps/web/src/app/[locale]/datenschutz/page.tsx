import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function DatenschutzPage() {
  const t = useTranslations('Legal');
  const tCommon = useTranslations('Common');

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white border border-zinc-200/80 rounded-xl p-8 shadow-sm space-y-6">
        <h1 className="text-3xl font-light tracking-tight border-b pb-4">{t('datenschutzTitle')}</h1>
        <p className="text-sm text-zinc-600 font-light leading-relaxed">
          {t('privacyIntro')}
        </p>
        <div className="space-y-4 text-sm font-light leading-relaxed text-zinc-700">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <section key={n} className="space-y-2">
              <h2 className="text-lg font-medium text-black">
                {t(`privacySec${n}Title` as 'privacySec1Title')}
              </h2>
              <p className="whitespace-pre-line">
                {t(`privacySec${n}Text` as 'privacySec1Text')}
              </p>
            </section>
          ))}
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
