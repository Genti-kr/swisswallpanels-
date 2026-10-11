'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { OrderItemDTO } from '@swisswall/types';
import { ProductImage } from '@/components/ProductImage';

type OrderItemsListProps = {
  items: OrderItemDTO[];
  formatLineTotal: (item: OrderItemDTO) => string;
  formatUnitPrice: (item: OrderItemDTO) => string;
  /** Rich cards for admin order detail; default is compact rows. */
  variant?: 'default' | 'admin';
};

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className="text-sm text-zinc-800 mt-0.5 break-words">{value}</dd>
    </div>
  );
}

export function OrderItemsList({
  items,
  formatLineTotal,
  formatUnitPrice,
  variant = 'default',
}: OrderItemsListProps) {
  if (variant === 'admin') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 font-light">
          {items.length} {items.length === 1 ? 'artikull' : 'artikuj'} — të dhënat si në momentin e porosisë
        </p>
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-0 sm:gap-0">
              <div className="relative w-full sm:w-36 md:w-40 aspect-[4/3] sm:aspect-auto sm:min-h-[9rem] shrink-0 bg-[#F8F8F6] border-b sm:border-b-0 sm:border-r border-zinc-100">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  sizes="(max-width: 640px) 100vw, 160px"
                  className="object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-zinc-900/75 text-[10px] font-bold text-white">
                  #{index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-zinc-900 leading-snug">
                      {item.productName}
                    </h3>
                    {item.variantName ? (
                      <p className="mt-1.5 inline-flex px-2.5 py-1 rounded-lg bg-[#C8B89A]/15 text-xs font-medium text-zinc-800 border border-[#C8B89A]/25">
                        Variante: {item.variantName}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-400">Pa variant (produkt bazë)</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Totali rreshtit
                    </p>
                    <p className="text-lg font-semibold text-zinc-900 tabular-nums">
                      {formatLineTotal(item)}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pt-2 border-t border-zinc-100">
                  <DetailField label="Sasia" value={item.quantity} />
                  <DetailField label="Çmimi / njësi" value={formatUnitPrice(item)} />
                  <DetailField
                    label="SKU"
                    value={
                      item.productSku ? (
                        <span className="font-mono text-xs">{item.productSku}</span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <DetailField
                    label="ID produkti"
                    value={<span className="font-mono text-[11px] text-zinc-600">{item.productId}</span>}
                  />
                  <DetailField label="ID rreshti" value={<span className="font-mono text-[11px] text-zinc-600">{item.id}</span>} />
                </dl>

                {item.productSlug ? (
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      href={`/de/produkte/${item.productSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8B89A] hover:text-[#1A1A1A] transition-colors"
                    >
                      Shiko produktin në faqe
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/admin/products"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                    >
                      Hap listën e produkteve (admin)
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Produkti nuk gjendet më në katalog — emri dhe çmimi mbeten si në porosi.
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

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
