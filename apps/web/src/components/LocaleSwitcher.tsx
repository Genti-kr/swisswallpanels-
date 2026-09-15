'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter, routing, type AppLocale } from '@/i18n/routing';

const LOCALE_LABELS: Record<AppLocale, string> = {
  de: 'DE',
  fr: 'FR',
  en: 'EN',
  sq: 'SQ',
};

type LocaleSwitcherProps = {
  variant?: 'header' | 'hero';
  className?: string;
};

export function LocaleSwitcher({ variant = 'header', className = '' }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const shellClass =
    variant === 'hero'
      ? 'inline-flex flex-wrap items-center justify-center gap-0.5 p-1 rounded-md border border-[#1A1A1A]/25 bg-white/90 shadow-sm'
      : 'inline-flex items-center gap-0.5 p-0.5 rounded-full border border-zinc-200 bg-zinc-50/90';

  const buttonBase =
    variant === 'hero'
      ? 'min-w-[2.75rem] px-3 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all'
      : 'min-w-[2rem] px-2 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all';

  return (
    <div className={`${shellClass} ${className}`} role="group" aria-label="Language">
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => router.replace(pathname, { locale: loc })}
            className={`${buttonBase} ${
              active
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : variant === 'hero'
                  ? 'text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/5 hover:text-[#1A1A1A]'
                  : 'text-zinc-600 hover:bg-white hover:text-[#1A1A1A]'
            }`}
            aria-current={active ? 'true' : undefined}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
