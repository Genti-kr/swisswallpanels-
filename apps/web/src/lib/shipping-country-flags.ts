import type { ShippingCountryCode } from '@/lib/shipping-geo';

/** Public SVG flags (from project AMF assets). */
export const SHIPPING_COUNTRY_FLAG_SRC: Record<ShippingCountryCode, string> = {
  CH: '/flags/shipping/ch.svg',
  DE: '/flags/shipping/de.svg',
  FR: '/flags/shipping/fr.svg',
  IT: '/flags/shipping/it.svg',
};
