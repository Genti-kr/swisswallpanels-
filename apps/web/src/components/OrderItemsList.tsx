'use client';

import { OrderItemDTO } from '@swisswall/types';
import { ProductImage } from '@/components/ProductImage';

type OrderItemsListProps = {
  items: OrderItemDTO[];
  formatLineTotal: (item: OrderItemDTO) => string;
  formatUnitPrice: (item: OrderItemDTO) => string;
};

export function OrderItemsList({ items, formatLineTotal, formatUnitPrice }: OrderItemsListProps) {
  return (
    <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 px-4 py-4 bg-white hover:bg-[#F8F8F6]/50 text-sm"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-zinc-100 bg-[#F8F8F6]">
            <ProductImage
              src={item.imageUrl}
              alt={item.productName}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 flex justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">{item.productName}</p>
              {item.variantName ? (
                <p className="text-xs text-zinc-500 mt-0.5">{item.variantName}</p>
              ) : null}
              <p className="text-xs text-zinc-600 mt-1">
                {item.quantity} × {formatUnitPrice(item)}
              </p>
            </div>
            <span className="font-semibold text-zinc-900 tabular-nums shrink-0 self-center">
              {formatLineTotal(item)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
