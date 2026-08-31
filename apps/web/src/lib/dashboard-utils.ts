export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  PAYMENT_CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-100',
  SHIPPED: 'bg-violet-50 text-violet-700 border-violet-100',
  DELIVERED: 'bg-green-50 text-green-700 border-green-100',
  CANCELLED: 'bg-red-50 text-red-700 border-red-100',
  REFUNDED: 'bg-zinc-50 text-zinc-600 border-zinc-100',
};

const DATE_LOCALES: Record<string, string> = {
  de: 'de-CH',
  fr: 'fr-CH',
  en: 'en-GB',
  sq: 'sq-AL',
};

export function formatDashboardMoney(value: number, currency = 'CHF', locale = 'de') {
  const intlLocale = DATE_LOCALES[locale] || 'de-CH';
  return new Intl.NumberFormat(intlLocale, { style: 'currency', currency }).format(value);
}

export function formatDashboardDate(value: string | Date, locale = 'de') {
  const intlLocale = DATE_LOCALES[locale] || 'de-CH';
  return new Date(value).toLocaleDateString(intlLocale);
}

export function formatDashboardDateTime(value: string | Date, locale = 'de') {
  const intlLocale = DATE_LOCALES[locale] || 'de-CH';
  return new Date(value).toLocaleString(intlLocale);
}
