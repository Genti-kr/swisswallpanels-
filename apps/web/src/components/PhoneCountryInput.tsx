'use client';

import type { ShippingCountryCode } from '@/lib/shipping-geo';
import {
  PHONE_COUNTRY_OPTIONS,
  normalizeLocalPhoneDigits,
  phoneCountryForShipping,
} from '@/lib/phone-countries';

type PhoneCountryInputProps = {
  country: ShippingCountryCode;
  onCountryChange: (country: ShippingCountryCode) => void;
  localDigits: string;
  onLocalDigitsChange: (digits: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
};

export function PhoneCountryInput({
  country,
  onCountryChange,
  localDigits,
  onLocalDigitsChange,
  placeholder,
  id = 'phone-local',
  required,
}: PhoneCountryInputProps) {
  const selected = phoneCountryForShipping(country);

  return (
    <div className="flex gap-2">
      <div className="relative shrink-0 w-[7.25rem] sm:w-[7.75rem]">
        <label htmlFor={`${id}-country`} className="sr-only">
          Country code
        </label>
        <select
          id={`${id}-country`}
          value={country}
          onChange={(e) => {
            const next = e.target.value as ShippingCountryCode;
            onCountryChange(next);
          }}
          className="w-full appearance-none bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl pl-3 pr-8 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800"
        >
          {PHONE_COUNTRY_OPTIONS.map((opt) => (
            <option key={opt.country} value={opt.country}>
              {opt.flag} {opt.dialCode}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs"
          aria-hidden
        >
          ▾
        </span>
      </div>
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
