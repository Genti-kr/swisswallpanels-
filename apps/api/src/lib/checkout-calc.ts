import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from './prisma';

export type CountryCode = 'CH' | 'DE' | 'FR' | 'IT';

export const VAT_RATES: Record<CountryCode, number> = {
  CH: 0.081,
  DE: 0.19,
  FR: 0.2,
  IT: 0.22,
};

export const CURRENCY_BY_COUNTRY: Record<CountryCode, string> = {
  CH: 'CHF',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
};

export const FREE_SHIPPING_THRESHOLDS: Record<CountryCode, number> = {
  CH: 150,
  DE: 100,
  FR: 120,
  IT: 120,
};

export function getVatRate(country: string): number {
  return VAT_RATES[country as CountryCode] ?? VAT_RATES.CH;
}

export function getCurrency(country: string): string {
  return CURRENCY_BY_COUNTRY[country as CountryCode] ?? 'CHF';
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTotals(params: {
  subtotalGross: number;
  shippingCost: number;
  discountAmount: number;
  country: string;
}) {
  const vatRate = getVatRate(params.country);
  const grossBeforeDiscount = params.subtotalGross + params.shippingCost;
  const grossAfterDiscount = Math.max(0, grossBeforeDiscount - params.discountAmount);
  const netSubtotal = roundMoney(grossAfterDiscount / (1 + vatRate));
  const vatAmount = roundMoney(grossAfterDiscount - netSubtotal);

  return {
    subtotal: netSubtotal,
    vatAmount,
    vatRate,
    total: roundMoney(grossAfterDiscount),
    currency: getCurrency(params.country),
  };
}

export async function resolveShippingCost(
  shippingRateId: string,
  subtotal: number
): Promise<{ cost: number; rate: Awaited<ReturnType<typeof prisma.shippingRate.findUnique>> }> {
  const rate = await prisma.shippingRate.findUnique({ where: { id: shippingRateId } });
  if (!rate || !rate.isActive) {
    throw new Error('Invalid shipping method');
  }

  const freeAbove = rate.freeAbove ? Number(rate.freeAbove) : null;
  const cost = freeAbove !== null && subtotal >= freeAbove ? 0 : Number(rate.price);

  return { cost, rate };
}

export async function validateCoupon(code: string, subtotal: number) {
  const coupon = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new Error('Invalid coupon code');
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error('Coupon has expired');
  }

  if (coupon.maxUsesTotal && coupon.usesCount >= coupon.maxUsesTotal) {
    throw new Error('Coupon usage limit reached');
  }

  if (coupon.minOrderChf && subtotal < Number(coupon.minOrderChf)) {
    throw new Error(`Minimum order value CHF ${Number(coupon.minOrderChf)} required`);
  }

  let discount =
    coupon.type === 'PERCENT'
      ? roundMoney((subtotal * Number(coupon.value)) / 100)
      : Number(coupon.value);

  discount = Math.min(discount, subtotal);

  return { coupon, discountAmount: discount };
}

export function getStripePaymentMethods(country: string, method: string): string[] {
  if (method === 'twint' && country === 'CH') return ['twint'];
  if (method === 'card') return ['card'];
  if (country === 'CH') return ['card', 'twint'];
  return ['card'];
}

export const PAYMENT_METHODS: Record<
  CountryCode,
  { id: string; label: string; stripe?: boolean }[]
> = {
  CH: [
    { id: 'twint', label: 'TWINT', stripe: true },
    { id: 'card', label: 'Credit / Debit Card', stripe: true },
    { id: 'transfer', label: 'Bank Transfer (IBAN)' },
    { id: 'invoice', label: 'Invoice (30 days)' },
    { id: 'postfinance', label: 'PostFinance Card' },
  ],
  DE: [
    { id: 'card', label: 'Credit Card (Stripe)', stripe: true },
    { id: 'sepa', label: 'SEPA Direct Debit' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'klarna', label: 'Klarna' },
    { id: 'sofort', label: 'Sofortüberweisung' },
  ],
  FR: [
    { id: 'card', label: 'Credit Card (Stripe)', stripe: true },
    { id: 'paypal', label: 'PayPal' },
    { id: 'klarna', label: 'Klarna' },
    { id: 'transfer', label: 'Virement Bancaire' },
  ],
  IT: [
    { id: 'card', label: 'Credit Card (Stripe)', stripe: true },
    { id: 'paypal', label: 'PayPal' },
    { id: 'klarna', label: 'Klarna' },
    { id: 'transfer', label: 'Bonifico Bancario' },
  ],
};

export const STRIPE_CHECKOUT_METHODS = ['stripe', 'twint', 'card'] as const;

export function assertPaymentMethodAllowed(country: string, method: string): void {
  const countryCode = (['CH', 'DE', 'FR', 'IT'].includes(country) ? country : 'CH') as CountryCode;
  const entry = PAYMENT_METHODS[countryCode].find((m) => m.id === method);

  if (!entry) {
    throw new Error('Payment method not available for this country');
  }

  const isOnlinePayment = Boolean(entry.stripe) || method === 'stripe';

  if (process.env.NODE_ENV === 'production' && !isOnlinePayment) {
    throw new Error('Only secure online payment is available at checkout');
  }

  if (!isOnlinePayment && process.env.ENABLE_MANUAL_PAYMENTS !== 'true') {
    throw new Error('Manual payment methods are not enabled');
  }
}
