/** ISO codes sent to API; UI shows localized full names via `Geo` messages. */
export const SHIPPING_COUNTRY_CODES = ['CH', 'DE', 'FR', 'IT'] as const;
export type ShippingCountryCode = (typeof SHIPPING_COUNTRY_CODES)[number];

export const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'BE', name: 'Bern' },
  { code: 'FR', name: 'Fribourg' },
  { code: 'GE', name: 'Genève' },
  { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuchâtel' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Ticino' },
  { code: 'UR', name: 'Uri' },
  { code: 'VS', name: 'Valais' },
  { code: 'VD', name: 'Vaud' },
  { code: 'ZG', name: 'Zug' },
  { code: 'ZH', name: 'Zürich' },
] as const;

export type SwissCantonCode = (typeof SWISS_CANTONS)[number]['code'];

export function isShippingCountryCode(value: string): value is ShippingCountryCode {
  return (SHIPPING_COUNTRY_CODES as readonly string[]).includes(value);
}

/** Admin UI (Albanian labels, no next-intl on /admin routes). */
export const SHIPPING_COUNTRY_LABELS_SQ: Record<ShippingCountryCode, string> = {
  CH: 'Zvicra',
  DE: 'Gjermania',
  FR: 'Francia',
  IT: 'Italia',
};

export function formatAdminCountry(code: string): string {
  return isShippingCountryCode(code) ? SHIPPING_COUNTRY_LABELS_SQ[code] : code;
}

export function formatAdminCanton(code: string | null | undefined): string {
  if (!code) return '';
  const match = SWISS_CANTONS.find((c) => c.code === code);
  return match?.name ?? code;
}
