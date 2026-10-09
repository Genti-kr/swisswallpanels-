'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCatalogPageCount,
  getCatalogPagerVisiblePages,
} from '@/lib/products-catalog';

type ProductsCatalogPagerProps = {
  totalProducts: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  labels: {
    page: string;
    prev: string;
    next: string;
  };
};

export function ProductsCatalogPager({
  totalProducts,
  currentPage,
  onPageChange,
  labels,
}: ProductsCatalogPagerProps) {
  const totalPages = getCatalogPageCount(totalProducts);
  const visiblePages = getCatalogPagerVisiblePages(currentPage, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  const go = (page: number) => {
    onPageChange(Math.min(totalPages, Math.max(1, page)));
  };

  return (
    <div className="mt-12 pt-8 border-t border-zinc-200/60">
      <p className="text-center text-xs text-zinc-400 font-light mb-4">{labels.page}</p>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={labels.prev}
          className="p-2.5 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:border-[#C8B89A] disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2 justify-center py-1 px-1">
          {visiblePages.map((num) => {
            const active = num === currentPage;
            return (
              <button
                key={num}
                type="button"
                onClick={() => go(num)}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 min-w-[2.75rem] h-11 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? 'bg-[#1A1A1A] text-white shadow-md ring-2 ring-[#C8B89A]/40'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:border-[#C8B89A] hover:text-zinc-900'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={labels.next}
          className="p-2.5 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:border-[#C8B89A] disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
