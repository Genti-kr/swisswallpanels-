import type { ShippingCountryCode } from '@/lib/shipping-geo';

export type PhoneCountryOption = {
  country: ShippingCountryCode;
  dialCode: string;
  /** Example local part (without leading 0 for CH). */
  exampleLocal: string;
};

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { country: 'CH', dialCode: '+41', exampleLocal: '79 123 45 67' },
  { country: 'DE', dialCode: '+49', exampleLocal: '151 23456789' },
  { country: 'FR', dialCode: '+33', exampleLocal: '6 12 34 56 78' },
  { country: 'IT', dialCode: '+39', exampleLocal: '312 345 6789' },
];

export function phoneCountryForShipping(country: ShippingCountryCode): PhoneCountryOption {
  return PHONE_COUNTRY_OPTIONS.find((o) => o.country === country) ?? PHONE_COUNTRY_OPTIONS[0];
}

export function splitStoredPhone(full: string): { country: ShippingCountryCode; local: string } {
  const trimmed = full.trim();
  if (!trimmed) {
    return { country: 'CH', local: '' };
  }

  const byDialLength = [...PHONE_COUNTRY_OPTIONS].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );
  for (const opt of byDialLength) {
    if (trimmed.startsWith(opt.dialCode)) {
      return {
        country: opt.country,
        local: normalizeLocalPhoneDigits(opt.country, trimmed.slice(opt.dialCode.length)),
      };
    }
  }

  return { country: 'CH', local: normalizeLocalPhoneDigits('CH', trimmed) };
}

/** Strip trunk 0 for CH/DE etc.; keep digits only for the national part. */
export function normalizeLocalPhoneDigits(country: ShippingCountryCode, raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if ((country === 'CH' || country === 'DE' || country === 'IT') && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 15);
}

export function formatPhoneE164(country: ShippingCountryCode, localDigits: string): string {
  const opt = phoneCountryForShipping(country);
  const normalized = normalizeLocalPhoneDigits(country, localDigits);
  if (!normalized) return '';
  return `${opt.dialCode} ${normalized}`;
}

export function isLocalPhoneValid(country: ShippingCountryCode, localDigits: string): boolean {
  const n = normalizeLocalPhoneDigits(country, localDigits);
  if (country === 'CH') return n.length >= 9;
  return n.length >= 6;
}
