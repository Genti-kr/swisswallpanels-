'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ShippingCountryCode } from '@/lib/shipping-geo';
import { ShippingCountryFlag } from '@/components/ShippingCountryFlag';

export type FlagCountryOption = {
  value: ShippingCountryCode;
  label: string;
  hint?: string;
};

type FlagCountryDropdownProps = {
  id?: string;
  value: ShippingCountryCode;
  options: FlagCountryOption[];
  onChange: (value: ShippingCountryCode) => void;
  /** Compact trigger (phone prefix). */
  compact?: boolean;
  ariaLabel: string;
};

export function FlagCountryDropdown({
  id: idProp,
  value,
  options,
  onChange,
  compact,
  ariaLabel,
}: FlagCountryDropdownProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${compact ? 'shrink-0 w-[8.75rem] sm:w-[9.25rem]' : 'w-full'}`}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-[#F8F8F6] text-left text-sm font-light text-zinc-800 transition-all hover:border-zinc-300 focus:border-[#C8B89A] focus:bg-white focus:outline-none ${
          compact ? 'py-3 pl-3 pr-8' : 'py-3.5 pl-4 pr-10'
        }`}
      >
        <ShippingCountryFlag code={value} />
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-200/60"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    active ? 'bg-[#C8B89A]/15 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <ShippingCountryFlag code={opt.value} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{opt.label}</span>
                    {opt.hint ? (
                      <span className="truncate text-[11px] font-light text-zinc-500">{opt.hint}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
