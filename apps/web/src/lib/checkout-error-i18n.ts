type CheckoutTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

/** Map API / legacy error text to Checkout message keys (locale-aware). */
export function resolveCheckoutError(raw: string, t: CheckoutTranslator): string {
  const msg = raw.trim();
  if (!msg) return t('checkoutFailed');

  const lower = msg.toLowerCase();

  if (
    msg.includes('Invalid coupon code') ||
    msg.includes('Invalid coupon') ||
    msg.includes('Kupon i pavlefshëm')
  ) {
    return t('invalidCoupon');
  }
  if (msg.includes('Coupon has expired') || msg.includes('Kuponi ka skaduar')) {
    return t('couponExpired');
  }
  if (msg.includes('Coupon usage limit') || msg.includes('limitin e përdorimeve')) {
    return t('couponUsageLimit');
  }

  const minMatch = msg.match(/Minimum order value CHF ([\d.]+) required/i);
  if (minMatch) {
    return t('minOrderValue', { amount: minMatch[1] });
  }

  if (msg.includes('Cart is empty') || msg.includes('Shporta është bosh')) {
    return t('emptyCart');
  }
  if (msg.includes('Cart session required') || msg.includes('Sesioni i shportës')) {
    return t('cartSessionRequired');
  }
  if (msg.includes('Invalid shipping method') || msg.includes('transportit nuk')) {
    return t('invalidShippingMethod');
  }
  if (msg.includes('Invalid Swiss PLZ') || msg.includes('PLZ')) {
    return t('invalidSwissPlz');
  }
  if (msg.includes('Payment method not available') || msg.includes('metodë pagese')) {
    return t('paymentMethodNotAvailable');
  }
  if (msg.includes('Only secure online payment') || msg.includes('Vetëm pagesa online')) {
    return t('onlinePaymentOnly');
  }
  if (msg.includes('Order total is too small') || msg.includes('shumë e vogël për pagesë')) {
    return t('orderTotalTooSmall');
  }
  if (msg.includes('Stripe payment integration is not configured') || msg.includes('nuk është konfiguruar në server')) {
    return t('stripeNotConfigured');
  }
  if (lower.includes('publishable') && lower.includes('stripe')) {
    return t('stripePublishableMissing');
  }
  if (msg.includes('Porosia nuk u krye') || msg.includes('Checkout failed')) {
    return t('checkoutGenericError');
  }
  if (msg.includes('Pagesa nuk u iniciua')) {
    return t('paymentInitFailed');
  }
  if (msg.includes('amount_too_small') || msg.includes('Shuma e porosisë është shumë e vogël')) {
    return t('amountTooSmall');
  }
  if (msg.includes('TWINT nuk është aktivizuar')) {
    return t('twintNotEnabled');
  }
  if (msg.includes('Metoda e pagesës nuk mbështetet')) {
    return t('paymentMethodNotSupported');
  }
  if (
    lower.includes('processing error occurred') ||
    lower.includes('payment form is still loading')
  ) {
    return t('paymentFormError');
  }

  return msg;
}
