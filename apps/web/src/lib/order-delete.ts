import { prisma } from './prisma';

/** Must match API `apps/api/src/lib/order-delete.ts` rules. */
export function isOrderDeletable(paymentStatus?: string | null): boolean {
  const ps = paymentStatus ?? 'PENDING';
  return ps !== 'PAID' && ps !== 'PARTIALLY_REFUNDED';
}

export async function deleteUnpaidOrderFromDb(orderId: string): Promise<void> {
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
