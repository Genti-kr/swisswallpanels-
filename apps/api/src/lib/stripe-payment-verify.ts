import type Stripe from 'stripe';

type OrderForPaymentVerify = {
  id: string;
  orderNumber: string;
  totalChf: unknown;
  currency: string;
  stripePaymentIntent: string | null;
};

export class StripePaymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripePaymentVerificationError';
  }
}

export function expectedStripeAmountMinor(totalChf: unknown): number {
  const total = Number(totalChf);
  if (!Number.isFinite(total) || total <= 0) {
    throw new StripePaymentVerificationError('Invalid order total for payment verification');
  }
  const minor = Math.round(total * 100);
  if (minor < 50) {
    throw new StripePaymentVerificationError('Order total is too small for online payment');
  }
  return minor;
}

/** Ensures a Stripe PaymentIntent belongs to this order and matches amount/currency. */
export function assertPaymentIntentMatchesOrder(
  paymentIntent: Stripe.PaymentIntent,
  order: OrderForPaymentVerify
): void {
  if (order.stripePaymentIntent && paymentIntent.id !== order.stripePaymentIntent) {
    throw new StripePaymentVerificationError('Payment intent does not match this order');
  }

  const expectedMinor = expectedStripeAmountMinor(order.totalChf);
  if (paymentIntent.amount !== expectedMinor) {
    throw new StripePaymentVerificationError('Payment amount does not match order total');
  }

  const expectedCurrency = (order.currency || 'CHF').toLowerCase();
  if (paymentIntent.currency !== expectedCurrency) {
    throw new StripePaymentVerificationError('Payment currency does not match order');
  }

  const metaOrderNumber = paymentIntent.metadata?.orderNumber;
  if (metaOrderNumber && metaOrderNumber !== order.orderNumber) {
    throw new StripePaymentVerificationError('Payment metadata does not match order');
  }

  const metaOrderId = paymentIntent.metadata?.orderId;
  if (metaOrderId && metaOrderId !== order.id) {
    throw new StripePaymentVerificationError('Payment metadata does not match order');
  }
}

export function isPaymentIntentPaidOrProcessing(status: Stripe.PaymentIntent.Status): boolean {
  return status === 'succeeded' || status === 'processing';
}
