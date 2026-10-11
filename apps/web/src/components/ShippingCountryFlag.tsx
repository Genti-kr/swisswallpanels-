import type { ShippingCountryCode } from '@/lib/shipping-geo';
import { SHIPPING_COUNTRY_FLAG_SRC } from '@/lib/shipping-country-flags';

type ShippingCountryFlagProps = {
  code: ShippingCountryCode;
  className?: string;
};

export function ShippingCountryFlag({ code, className }: ShippingCountryFlagProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static SVG flags
    <img
      src={SHIPPING_COUNTRY_FLAG_SRC[code]}
      alt=""
      width={20}
      height={15}
      className={
        className ??
        'h-[15px] w-5 rounded-[3px] object-cover border border-zinc-200/70 shadow-sm shrink-0'
      }
      aria-hidden
    />
  );
}
