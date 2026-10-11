import Stripe from 'stripe';

const PLACEHOLDER_PATTERNS = ['...', 'placeholder', 'your-', 'change-me', 'sk_test_...', 'whsec_...', 'pk_test_...'];

export function isPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim() === '') return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (isPlaceholder(key)) return null;
  return new Stripe(key!);
}

export function isStripeConfigured(): boolean {
  return getStripe() !== null && !isPlaceholder(process.env.STRIPE_WEBHOOK_SECRET);
}

/** Checkout + TWINT/card: secret + publishable; production also requires webhook secret. */
export function isStripeCheckoutReady(): boolean {
  if (!getStripe() || !getStripePublishableKey()) {
    return false;
  }
  if (process.env.NODE_ENV === 'production') {
    return !isPlaceholder(process.env.STRIPE_WEBHOOK_SECRET);
  }
  return true;
}

export function getStripePublishableKey(): string | null {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (isPlaceholder(key)) return null;
  return key!;
}
