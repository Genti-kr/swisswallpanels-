'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  readStoredConsent,
  storeConsent,
  logConsentToServer,
  type ConsentCategories,
} from '@/lib/consent';

export function CookieConsent() {
  const t = useTranslations('CookieConsent');
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = readStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  async function saveConsent(next: ConsentCategories, existingId?: string) {
    const stored = storeConsent(next, existingId);
    await logConsentToServer(stored, locale);
    setVisible(false);
    setShowSettings(false);
  }

  function handleAcceptAll() {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  }

  function handleAcceptSelected() {
    saveConsent(categories);
  }

  function handleNecessaryOnly() {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6">
        <h2 id="cookie-consent-title" className="text-base font-medium text-[#1A1A1A]">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm font-light leading-relaxed text-zinc-600">
          {t('description')}{' '}
          <Link href="/datenschutz" className="text-[#C8B89A] underline hover:text-[#1A1A1A]">
            {t('privacyLink')}
          </Link>
        </p>

        {showSettings && (
          <div className="mt-4 space-y-3 rounded-lg border border-zinc-100 bg-[#F8F8F6] p-4">
            <ConsentToggle
              label={t('necessaryLabel')}
              description={t('necessaryDesc')}
              checked
              disabled
            />
            <ConsentToggle
              label={t('analyticsLabel')}
              description={t('analyticsDesc')}
              checked={categories.analytics}
              onChange={(v) => setCategories((c) => ({ ...c, analytics: v }))}
            />
            <ConsentToggle
              label={t('marketingLabel')}
              description={t('marketingDesc')}
              checked={categories.marketing}
              onChange={(v) => setCategories((c) => ({ ...c, marketing: v }))}
            />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-zinc-800"
          >
            {t('acceptAll')}
          </button>
          {showSettings ? (
            <button
              type="button"
              onClick={handleAcceptSelected}
              className="rounded-lg border border-[#1A1A1A] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] transition hover:bg-zinc-50"
            >
              {t('acceptSelected')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-50"
            >
              {t('settings')}
            </button>
          )}
          <button
            type="button"
            onClick={handleNecessaryOnly}
            className="text-xs font-medium text-zinc-500 underline transition hover:text-[#1A1A1A]"
          >
            {t('necessaryOnly')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-70' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-zinc-300"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-[#1A1A1A]">{label}</span>
        <span className="block text-xs font-light text-zinc-500">{description}</span>
      </span>
    </label>
  );
}
