import {
  formatAdminCountry,
  isShippingCountryCode,
  type ShippingCountryCode,
} from '@/lib/shipping-geo';

/** Albanian labels for admin (no next-intl on /admin). */
const ADMIN_PAYMENT_METHOD_LABELS: Record<string, string> = {
  twint: 'TWINT',
  card: 'Kartë (Stripe)',
  stripe: 'Stripe (kartë)',
  transfer: 'Transfer bankar',
  invoice: 'Faturë',
  postfinance: 'PostFinance',
  sepa: 'SEPA',
  paypal: 'PayPal',
  klarna: 'Klarna',
  sofort: 'Sofort',
};

export function formatAdminPaymentMethod(method: string | null | undefined): string {
  if (!method?.trim()) return '—';
  const key = method.trim().toLowerCase();
  return ADMIN_PAYMENT_METHOD_LABELS[key] ?? method;
}

export function formatAdminCountryWithCode(code: string | null | undefined): string {
  if (!code) return '—';
  const name = formatAdminCountry(code);
  return isShippingCountryCode(code) ? `${name} (${code})` : name;
}

export function orderShippingCountry(order: {
  country?: string | null;
  shippingAddressJson?: { country?: string } | null;
}): string {
  return order.shippingAddressJson?.country ?? order.country ?? '';
}

export function orderShippingPhone(order: {
  shippingAddressJson?: { phone?: string | null } | null;
  user?: { phone?: string | null } | null;
}): string {
  const fromAddress = order.shippingAddressJson?.phone?.trim();
  if (fromAddress) return fromAddress;
  return order.user?.phone?.trim() ?? '';
}

export function telHrefFromDisplayPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function isShippingCountryForFlag(
  code: string | null | undefined
): code is ShippingCountryCode {
  return !!code && isShippingCountryCode(code);
}
