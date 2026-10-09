'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { usePathname, useRouter, routing, type AppLocale } from '@/i18n/routing';

const LOCALE_LABELS: Record<AppLocale, string> = {
  de: 'DE',
  fr: 'FR',
  en: 'EN',
  sq: 'SQ',
};

/** Flag assets in /public/flags (sq → Albania, en → US). */
const LOCALE_FLAG_SRC: Record<AppLocale, string> = {
  de: '/flags/de.svg',
  fr: '/flags/fr.svg',
  en: '/flags/en.svg',
  sq: '/flags/sq.svg',
};

function LocaleFlag({ locale, size = 18 }: { locale: AppLocale; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG flags
    <img
      src={LOCALE_FLAG_SRC[locale]}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover ring-1 ring-black/10 shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
      loading="lazy"
      decoding="async"
    />
  );
}

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, locale]);

  const switchLocale = (next: AppLocale) => {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setOpen(false);
    router.replace(pathname, { locale: next });
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-zinc-200 bg-zinc-50/90 text-[#1A1A1A] hover:border-[#C8B89A] hover:bg-white transition-all"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Language"
      >
        <LocaleFlag locale={locale} size={20} />
        {LOCALE_LABELS[locale]}
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[60] min-w-[7.5rem] py-1 rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/50"
        >
          {routing.locales.map((loc) => {
            const active = loc === locale;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => switchLocale(loc)}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    active
                      ? 'bg-[#F8F8F6] text-[#1A1A1A] cursor-default'
                      : 'text-zinc-700 hover:bg-[#F8F8F6] hover:text-[#1A1A1A]'
                  }`}
                >
                  <LocaleFlag locale={loc} size={22} />
                  {LOCALE_LABELS[loc]}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
