import { apiFetch } from './api';
import type { OrderDTO } from '@swisswall/types';

const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 5000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type VerifyPaymentResponse = {
  order: OrderDTO;
  confirmed: boolean;
};

/**
 * Confirms order payment server-side after Stripe client success.
 * Retries to allow webhook processing to complete first.
 */
export async function confirmOrderPaymentWithRetry(
  orderId: string,
  guestEmail?: string
): Promise<VerifyPaymentResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    try {
      const res = await apiFetch<VerifyPaymentResponse>(`/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify(guestEmail ? { email: guestEmail } : {}),
      });

      if (res.confirmed) {
        return res;
      }

      lastError = new Error('Payment not confirmed yet');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Payment verification failed');

      const message = lastError.message.toLowerCase();
      const retryable =
        message.includes('not been completed') ||
        message.includes('payment has not') ||
        message.includes('502') ||
        message.includes('503');

      if (!retryable && attempt === 0) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Payment verification timed out. Check your email for confirmation.');
}
