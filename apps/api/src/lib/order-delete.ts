import { PaymentStatus } from '@swisswall/types';
import { prisma } from './prisma';
import { getStripe } from './stripe';

/** Only fully or partially paid orders must be kept for accounting. */
const BLOCKED_PAYMENT_STATUSES: PaymentStatus[] = ['PAID', 'PARTIALLY_REFUNDED'];

export function isOrderDeletable(paymentStatus: string | null | undefined): boolean {
  const ps = (paymentStatus ?? 'PENDING') as PaymentStatus;
  return !BLOCKED_PAYMENT_STATUSES.includes(ps);
}

export async function deleteUnpaidOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  if (!isOrderDeletable(order.paymentStatus)) {
    const err = new Error('ORDER_PAID') as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }

  if (order.stripePaymentIntent) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntent);
        if (
          intent.status === 'requires_payment_method' ||
          intent.status === 'requires_confirmation' ||
          intent.status === 'requires_action'
        ) {
          await stripe.paymentIntents.cancel(order.stripePaymentIntent);
        }
      } catch {
        // Continue — intent may already be canceled or expired
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (order.discountCodeId) {
      await tx.discountCode.updateMany({
        where: { id: order.discountCodeId, usesCount: { gt: 0 } },
        data: { usesCount: { decrement: 1 } },
      });
    }
    await tx.order.delete({ where: { id: order.id } });
  });
}
