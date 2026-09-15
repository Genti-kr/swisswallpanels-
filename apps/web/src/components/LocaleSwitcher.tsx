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

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const otherLocales = routing.locales.filter((loc) => loc !== locale);

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
    setOpen(false);
    router.replace(pathname, { locale: next });
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 px-3 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-zinc-200 bg-zinc-50/90 text-[#1A1A1A] hover:border-[#C8B89A] hover:bg-white transition-all"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Language"
      >
        {LOCALE_LABELS[locale]}
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && otherLocales.length > 0 && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[60] min-w-[4.25rem] py-1 rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/50"
        >
          {otherLocales.map((loc) => (
            <li key={loc} role="option">
              <button
                type="button"
                onClick={() => switchLocale(loc)}
                className="w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-[#F8F8F6] hover:text-[#1A1A1A] transition-colors"
              >
                {LOCALE_LABELS[loc]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
