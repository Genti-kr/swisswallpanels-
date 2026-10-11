'use client';

import { useMemo } from 'react';
import type { ShippingCountryCode } from '@/lib/shipping-geo';
import {
  PHONE_COUNTRY_OPTIONS,
  normalizeLocalPhoneDigits,
  phoneCountryForShipping,
} from '@/lib/phone-countries';
import { FlagCountryDropdown } from '@/components/FlagCountryDropdown';

type PhoneCountryInputProps = {
  country: ShippingCountryCode;
  onCountryChange: (country: ShippingCountryCode) => void;
  localDigits: string;
  onLocalDigitsChange: (digits: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  /** Localized country names for dropdown hints (optional). */
  countryLabels?: Partial<Record<ShippingCountryCode, string>>;
};

export function PhoneCountryInput({
  country,
  onCountryChange,
  localDigits,
  onLocalDigitsChange,
  placeholder,
  id = 'phone-local',
  required,
  countryLabels,
}: PhoneCountryInputProps) {
  const selected = phoneCountryForShipping(country);

  const dialOptions = useMemo(
    () =>
      PHONE_COUNTRY_OPTIONS.map((opt) => ({
        value: opt.country,
        label: opt.dialCode,
        hint: countryLabels?.[opt.country],
      })),
    [countryLabels]
  );

  return (
    <div className="flex gap-2">
      <FlagCountryDropdown
        id={`${id}-country`}
        value={country}
        options={dialOptions}
        onChange={onCountryChange}
        compact
        ariaLabel="Country calling code"
      />
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        placeholder={placeholder ?? selected.exampleLocal}
        value={localDigits}
        onChange={(e) => onLocalDigitsChange(normalizeLocalPhoneDigits(country, e.target.value))}
        className="flex-1 min-w-0 bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800"
      />
    </div>
  );
}
