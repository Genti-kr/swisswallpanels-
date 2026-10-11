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

/**
 * National number length after prefix (no leading trunk 0).
 * Based on ITU / national numbering: CH & FR fixed 9; DE up to 11; IT mobile mostly 10.
 */
export const PHONE_LOCAL_DIGIT_LIMITS: Record<
  ShippingCountryCode,
  { min: number; max: number }
> = {
  CH: { min: 9, max: 9 },
  DE: { min: 7, max: 11 },
  FR: { min: 9, max: 9 },
  IT: { min: 9, max: 10 },
};

const TRUNK_ZERO_COUNTRIES: ShippingCountryCode[] = ['CH', 'DE', 'FR', 'IT'];

export function phoneLocalDigitLimits(country: ShippingCountryCode): { min: number; max: number } {
  return PHONE_LOCAL_DIGIT_LIMITS[country] ?? PHONE_LOCAL_DIGIT_LIMITS.CH;
}

export function phoneLocalMaxDigits(country: ShippingCountryCode): number {
  return phoneLocalDigitLimits(country).max;
}

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

/** Strip trunk 0 domestically; keep digits only for the national part. */
export function normalizeLocalPhoneDigits(country: ShippingCountryCode, raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (TRUNK_ZERO_COUNTRIES.includes(country) && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const { max } = phoneLocalDigitLimits(country);
  return digits.slice(0, max);
}

export function formatPhoneE164(country: ShippingCountryCode, localDigits: string): string {
  const opt = phoneCountryForShipping(country);
  const normalized = normalizeLocalPhoneDigits(country, localDigits);
  if (!normalized) return '';
  return `${opt.dialCode} ${normalized}`;
}

export function isLocalPhoneValid(country: ShippingCountryCode, localDigits: string): boolean {
  const n = normalizeLocalPhoneDigits(country, localDigits);
  const { min, max } = phoneLocalDigitLimits(country);
  return n.length >= min && n.length <= max;
}
