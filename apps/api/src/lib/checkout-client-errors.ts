import Stripe from 'stripe';

/** English messages for checkout — storefront maps to locale via checkout-error-i18n. */
export function mapCheckoutClientError(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    const code = err.code || '';
    if (code === 'amount_too_small') {
      return 'Order total is too small for online payment.';
    }
    if (err.type === 'StripeInvalidRequestError') {
      const msg = err.message.toLowerCase();
      if (msg.includes('twint')) {
        return 'TWINT is not enabled on the Stripe account. Try card payment or contact support.';
      }
      if (msg.includes('payment_method_types')) {
        return 'Payment method not supported. Try credit card.';
      }
    }
    return 'Payment could not be started. Check the total or try another method.';
  }

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (message.includes('Stripe payment integration is not configured')) {
    return 'Online payment is not configured on the server. Try again later or contact us.';
  }
  if (message.includes('Cart is empty')) {
    return 'Cart is empty.';
  }
  if (message.includes('Cart session required')) {
    return 'Cart session required. Refresh the page and try again.';
  }
  if (message.includes('Invalid shipping method')) {
    return 'Invalid shipping method.';
  }
  if (message.includes('Invalid Swiss PLZ')) {
    return 'Invalid Swiss PLZ.';
  }
  if (message.includes('Payment method not available')) {
    return 'Payment method not available for this country.';
  }
  if (message.includes('Only secure online payment')) {
    return 'Only secure online payment (card/TWINT) is available.';
  }
  if (message.includes('Order total is too small')) {
    return 'Order total is too small for online payment.';
  }
  if (message.includes('Invalid coupon code')) {
    return 'Invalid coupon code.';
  }
  if (message.includes('Coupon has expired')) {
    return 'Coupon has expired.';
  }
  if (message.includes('Coupon usage limit')) {
    return 'Coupon usage limit reached.';
  }
  if (message.includes('Minimum order value')) {
    return message;
  }
  if (lower.includes('publishable') && lower.includes('stripe')) {
    return 'Stripe publishable key is missing on the server.';
  }

  if (process.env.NODE_ENV !== 'production') {
    return message || 'Checkout failed';
  }

  return 'Checkout failed. Check your details and try again.';
}
