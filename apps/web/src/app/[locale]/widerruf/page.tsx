import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

const SECTION_COUNT = 6;

export default function WiderrufPage() {
  const t = useTranslations('Legal');
  const tCommon = useTranslations('Common');

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white border border-zinc-200/80 rounded-xl p-8 shadow-sm space-y-6">
        <h1 className="text-3xl font-light tracking-tight border-b pb-4">{t('widerrufTitle')}</h1>
        <p className="text-sm text-zinc-600 font-light leading-relaxed">{t('widerrufIntro')}</p>
        <div className="space-y-4 text-sm font-light leading-relaxed text-zinc-700">
          {Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
            <section key={n} className="space-y-2">
              <h2 className="text-lg font-medium text-black">
                {t(`widerrufSec${n}Title` as 'widerrufSec1Title')}
              </h2>
              <p className="whitespace-pre-line">
                {t(`widerrufSec${n}Text` as 'widerrufSec1Text')}
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
