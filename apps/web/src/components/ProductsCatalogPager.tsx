'use client';

import { useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCatalogPageCount } from '@/lib/products-catalog';

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

/** Keep page 1–3 visible at the start of the horizontal track (avoid snap/center jumping to ~7). */
function syncTrackScroll(track: HTMLElement, currentPage: number) {
  if (currentPage <= 3) {
    track.scrollLeft = 0;
    return;
  }
  const active = track.querySelector(`[data-page="${currentPage}"]`);
  if (!(active instanceof HTMLElement)) return;
  const left =
    active.offsetLeft - track.clientWidth / 2 + active.clientWidth / 2;
  track.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
}

export function ProductsCatalogPager({
  totalProducts,
  currentPage,
  onPageChange,
  labels,
}: ProductsCatalogPagerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const totalPages = getCatalogPageCount(totalProducts);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || totalPages <= 1) return;
    syncTrackScroll(track, currentPage);
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
      <div className="flex items-center justify-center gap-3">
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
          className="flex gap-2 max-w-[min(100%,420px)] overflow-x-auto py-1 px-1 scroll-smooth scrollbar-none"
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
                className={`shrink-0 min-w-[2.75rem] h-11 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  active
                    ? 'bg-[#1A1A1A] text-white shadow-md scale-105'
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
