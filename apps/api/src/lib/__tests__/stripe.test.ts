import { describe, expect, it } from 'vitest';
import { getStripe, getStripePublishableKey, isPlaceholder, isStripeConfigured } from '../stripe';

describe('stripe helpers', () => {
  it('detects placeholder keys', () => {
    expect(isPlaceholder('sk_test_...')).toBe(true);
    expect(isPlaceholder('your-postmark-key')).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder('sk_test_51AbCdEf')).toBe(false);
  });

  it('returns null stripe client when not configured', () => {
    const original = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_...';
    expect(getStripe()).toBeNull();
    process.env.STRIPE_SECRET_KEY = original;
  });

  it('reports stripe as not configured without webhook secret', () => {
    const origSecret = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_real';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_...';
    expect(isStripeConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
  });

  it('returns null publishable key for placeholders', () => {
    const original = process.env.STRIPE_PUBLISHABLE_KEY;
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_...';
    expect(getStripePublishableKey()).toBeNull();
    process.env.STRIPE_PUBLISHABLE_KEY = original;
  });
});
