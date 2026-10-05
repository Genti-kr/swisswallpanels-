'use client';

import { Link } from '@/i18n/routing';
import { ProductDTO } from '@swisswall/types';
import { ProductPhotoFrame } from '@/components/ProductPhotoFrame';
import { Plus, Sparkles, Volume2 } from 'lucide-react';

type ProductListingCardProps = {
  product: ProductDTO;
  locale: string;
  categoryLabel: string;
  priceLabel: string;
  addToCartLabel: string;
  onAddToCart: (productId: string) => void;
  layout?: 'grid' | 'carousel';
};

export function ProductListingCard({
  product: p,
  locale,
  categoryLabel,
  priceLabel,
  addToCartLabel,
  onAddToCart,
  layout = 'grid',
}: ProductListingCardProps) {
  const name = p.nameJson[locale as keyof typeof p.nameJson] || p.nameJson.de;
  const desc = p.descJson[locale as keyof typeof p.descJson] || p.descJson.de;

  const layoutClass =
    layout === 'carousel'
      ? 'snap-start shrink-0 w-[min(100%,280px)] sm:w-[300px]'
      : '';

  return (
    <Link
      href={`/produkte/${p.slug}`}
      className={`group bg-white border border-zinc-200/40 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer ${layoutClass}`}
    >
      <div>
        <div className="relative w-full">
          <ProductPhotoFrame src={p.images[0]?.url} alt={name} variant="card" hoverZoom />
          {p.isFeatured && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-[#C8B89A] text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 select-none pointer-events-none">
              <Sparkles className="w-3 h-3" />
              Premium
            </span>
          )}
          {p.acousticRating && (
            <span className="absolute top-2.5 right-2.5 z-10 bg-zinc-900/90 text-white text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full backdrop-blur flex items-center gap-1 select-none pointer-events-none">
              <Volume2 className="w-3 h-3 text-[#C8B89A]" />
              NRC {p.acousticRating.toFixed(2)}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <span className="text-[10px] font-semibold text-[#C8B89A] uppercase tracking-widest block line-clamp-1">
            {categoryLabel}
          </span>
          <h2 className="text-lg font-light text-zinc-900 group-hover:text-[#C8B89A] transition-colors duration-300 line-clamp-1">
            {name}
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-2">{desc}</p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">
            {priceLabel}
          </span>
          <span className="text-base font-semibold text-zinc-900">CHF {p.priceChf.toFixed(2)}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCart(p.id);
          }}
          className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] p-2.5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center"
          title={addToCartLabel}
          aria-label={addToCartLabel}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}
