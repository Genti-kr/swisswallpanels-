import Stripe from 'stripe';

/** User-visible checkout/payment errors (safe in production). */
export function mapCheckoutClientError(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    const code = err.code || '';
    if (code === 'amount_too_small') {
      return 'Shuma e porosisë është shumë e vogël për pagesë online.';
    }
    if (err.type === 'StripeInvalidRequestError') {
      const msg = err.message.toLowerCase();
      if (msg.includes('twint')) {
        return 'TWINT nuk është aktivizuar në llogarinë Stripe. Provoni me kartë ose kontaktoni suportin.';
      }
      if (msg.includes('payment_method_types')) {
        return 'Metoda e pagesës nuk mbështetet. Provoni kartë krediti.';
      }
    }
    return 'Pagesa nuk u iniciua. Kontrollo totalin ose provo një metodë tjetër.';
  }

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (message.includes('Stripe payment integration is not configured')) {
    return 'Pagesa online nuk është konfiguruar në server. Provoni më vonë ose na kontaktoni.';
  }
  if (message.includes('Cart is empty')) {
    return 'Shporta është bosh.';
  }
  if (message.includes('Cart session required')) {
    return 'Sesioni i shportës mungon. Rifreskoni faqen dhe provoni përsëri.';
  }
  if (message.includes('Invalid shipping method')) {
    return 'Metoda e transportit nuk është e vlefshme.';
  }
  if (message.includes('Invalid Swiss PLZ')) {
    return 'Kodi postar zviceran (PLZ) nuk është i vlefshëm.';
  }
  if (message.includes('Payment method not available')) {
    return 'Kjo metodë pagese nuk mbështetet për vendin tuaj.';
  }
  if (message.includes('Only secure online payment')) {
    return 'Vetëm pagesa online (kartë/TWINT) është e disponueshme.';
  }
  if (message.includes('Order total is too small')) {
    return 'Totali i porosisë është shumë i vogël për pagesë online.';
  }
  if (message.includes('Invalid coupon code')) {
    return 'Kupon i pavlefshëm.';
  }
  if (message.includes('Coupon has expired')) {
    return 'Kuponi ka skaduar.';
  }
  if (message.includes('Coupon usage limit')) {
    return 'Kuponi ka arritur limitin e përdorimeve.';
  }
  if (message.includes('Minimum order value')) {
    return message;
  }
  if (lower.includes('publishable') && lower.includes('stripe')) {
    return 'Konfigurimi i Stripe (çelësi publik) mungon në server.';
  }

  if (process.env.NODE_ENV !== 'production') {
    return message || 'Checkout failed';
  }

  return 'Porosia nuk u krye. Kontrollo të dhënat dhe provo përsëri.';
}
