import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import {
  assertPaymentIntentMatchesOrder,
  expectedStripeAmountMinor,
  StripePaymentVerificationError,
} from '../stripe-payment-verify';

describe('stripe-payment-verify', () => {
  const order = {
    id: 'ord_1',
    orderNumber: 'SWP-1001',
    totalChf: 199.5,
    currency: 'CHF',
    stripePaymentIntent: 'pi_abc',
  };

  const baseIntent = {
    id: 'pi_abc',
    amount: 19950,
    currency: 'chf',
    metadata: { orderNumber: 'SWP-1001', orderId: 'ord_1' },
  } as Stripe.PaymentIntent;

  it('accepts matching payment intent', () => {
    expect(() => assertPaymentIntentMatchesOrder(baseIntent, order)).not.toThrow();
  });

  it('rejects amount mismatch', () => {
    const intent = { ...baseIntent, amount: 100 } as Stripe.PaymentIntent;
    expect(() => assertPaymentIntentMatchesOrder(intent, order)).toThrow(
      StripePaymentVerificationError
    );
  });

  it('rejects wrong payment intent id', () => {
    const intent = { ...baseIntent, id: 'pi_other' } as Stripe.PaymentIntent;
    expect(() => assertPaymentIntentMatchesOrder(intent, order)).toThrow(
      StripePaymentVerificationError
    );
  });

  it('computes minor units from CHF total', () => {
    expect(expectedStripeAmountMinor(89)).toBe(8900);
    expect(expectedStripeAmountMinor('199.50')).toBe(19950);
  });
});
