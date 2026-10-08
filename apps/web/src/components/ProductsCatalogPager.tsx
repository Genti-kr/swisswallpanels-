'use client';

import { useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCatalogPageCount } from '@/lib/products-catalog';
import { syncCatalogPagerTrackScroll } from '@/lib/catalog-pager-scroll';

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
  const trackRef = useRef<HTMLDivElement>(null);
  const firstScrollRef = useRef(true);
  const totalPages = getCatalogPageCount(totalProducts);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || totalPages <= 1) return;

    const behavior: ScrollBehavior = firstScrollRef.current ? 'auto' : 'smooth';
    firstScrollRef.current = false;
    syncCatalogPagerTrackScroll(track, currentPage, totalPages, behavior);
  }, [currentPage, totalPages]);

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

        <div
          ref={trackRef}
          className="flex gap-2 w-full max-w-[min(100%,32rem)] overflow-x-auto py-1 px-2 scroll-smooth scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
            const active = num === currentPage;
            return (
              <button
                key={num}
                type="button"
                data-page={num}
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
