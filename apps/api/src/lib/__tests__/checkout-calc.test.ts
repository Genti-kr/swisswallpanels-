import { describe, expect, it } from 'vitest';
import {
  calculateTotals,
  getCurrency,
  getStripePaymentMethods,
  getVatRate,
  roundMoney,
  assertPaymentMethodAllowed,
} from '../checkout-calc';

describe('checkout-calc', () => {
  it('calculates Swiss VAT totals correctly', () => {
    const result = calculateTotals({
      subtotalGross: 108.1,
      shippingCost: 0,
      discountAmount: 0,
      country: 'CH',
    });

    expect(result.currency).toBe('CHF');
    expect(result.vatRate).toBe(0.081);
    expect(result.subtotal).toBe(100);
    expect(result.vatAmount).toBe(8.1);
    expect(result.total).toBe(108.1);
  });

  it('applies discount before VAT split', () => {
    const result = calculateTotals({
      subtotalGross: 200,
      shippingCost: 10,
      discountAmount: 20,
      country: 'CH',
    });

    expect(result.total).toBe(190);
    expect(result.subtotal + result.vatAmount).toBe(result.total);
  });

  it('returns correct currency per country', () => {
    expect(getCurrency('DE')).toBe('EUR');
    expect(getCurrency('CH')).toBe('CHF');
    expect(getCurrency('XX')).toBe('CHF');
  });

  it('returns correct VAT rate per country', () => {
    expect(getVatRate('FR')).toBe(0.2);
    expect(getVatRate('unknown')).toBe(0.081);
  });

  it('rounds money to 2 decimals', () => {
    expect(roundMoney(10.456)).toBe(10.46);
  });

  it('resolves stripe payment methods for TWINT in CH', () => {
    expect(getStripePaymentMethods('CH', 'twint')).toEqual(['twint']);
    expect(getStripePaymentMethods('DE', 'card')).toEqual(['card']);
    expect(getStripePaymentMethods('CH', 'stripe')).toContain('twint');
  });

  it('rejects manual payment methods unless explicitly enabled', () => {
    const previousEnv = process.env.NODE_ENV;
    const previousManual = process.env.ENABLE_MANUAL_PAYMENTS;

    process.env.NODE_ENV = 'development';
    process.env.ENABLE_MANUAL_PAYMENTS = 'false';
    expect(() => assertPaymentMethodAllowed('CH', 'transfer')).toThrow(
      'Manual payment methods are not enabled'
    );

    process.env.NODE_ENV = 'production';
    expect(() => assertPaymentMethodAllowed('CH', 'transfer')).toThrow(
      'Only secure online payment is available at checkout'
    );

    expect(() => assertPaymentMethodAllowed('CH', 'card')).not.toThrow();

    process.env.NODE_ENV = previousEnv;
    process.env.ENABLE_MANUAL_PAYMENTS = previousManual;
  });
});
