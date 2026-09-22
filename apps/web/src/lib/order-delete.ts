/** Must match API `order-delete.ts` rules. */
export function isOrderDeletable(paymentStatus?: string | null): boolean {
  const ps = paymentStatus ?? 'PENDING';
  return ps !== 'PAID' && ps !== 'PARTIALLY_REFUNDED';
}
