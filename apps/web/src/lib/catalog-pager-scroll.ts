const NEIGHBOR_RADIUS = 2;
const EDGE_ANCHOR_COUNT = 3;
const TRACK_PADDING_PX = 6;

function pageButton(track: HTMLElement, page: number): HTMLElement | null {
  const el = track.querySelector(`[data-page="${page}"]`);
  return el instanceof HTMLElement ? el : null;
}

function collectPagesToKeepVisible(
  currentPage: number,
  totalPages: number
): number[] {
  const set = new Set<number>();

  for (let d = -NEIGHBOR_RADIUS; d <= NEIGHBOR_RADIUS; d++) {
    const p = currentPage + d;
    if (p >= 1 && p <= totalPages) set.add(p);
  }

  if (currentPage <= NEIGHBOR_RADIUS + 1) {
    for (let p = 1; p <= Math.min(EDGE_ANCHOR_COUNT, totalPages); p++) set.add(p);
  }
  if (currentPage >= totalPages - NEIGHBOR_RADIUS) {
    for (let p = Math.max(1, totalPages - EDGE_ANCHOR_COUNT + 1); p <= totalPages; p++) {
      set.add(p);
    }
  }

  return [...set].sort((a, b) => a - b);
}

function boundsForButtons(buttons: HTMLElement[]): { minLeft: number; maxRight: number } {
  let minLeft = Infinity;
  let maxRight = -Infinity;
  for (const btn of buttons) {
    minLeft = Math.min(minLeft, btn.offsetLeft);
    maxRight = Math.max(maxRight, btn.offsetLeft + btn.offsetWidth);
  }
  return { minLeft, maxRight };
}

/**
 * Scroll the horizontal page track so the active page and its neighbors stay fully visible.
 */
export function syncCatalogPagerTrackScroll(
  track: HTMLElement,
  currentPage: number,
  totalPages: number,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (totalPages <= 1) return;

  const pageNums = collectPagesToKeepVisible(currentPage, totalPages);
  const buttons = pageNums
    .map((p) => pageButton(track, p))
    .filter((b): b is HTMLElement => b !== null);

  if (buttons.length === 0) return;

  const viewW = track.clientWidth;
  const maxScroll = Math.max(0, track.scrollWidth - viewW);
  let { minLeft, maxRight } = boundsForButtons(buttons);
  const span = maxRight - minLeft;

  let scrollLeft: number;

  if (span <= viewW - TRACK_PADDING_PX * 2) {
    scrollLeft = minLeft - (viewW - span) / 2;
  } else {
    const prev = pageButton(track, currentPage - 1);
    const active = pageButton(track, currentPage);
    const next = pageButton(track, currentPage + 1);
    if (!active) return;

    const group = [prev, active, next].filter((b): b is HTMLElement => b !== null);
    ({ minLeft, maxRight } = boundsForButtons(group));
    scrollLeft = minLeft - TRACK_PADDING_PX;
    if (maxRight - scrollLeft > viewW - TRACK_PADDING_PX) {
      scrollLeft = maxRight - viewW + TRACK_PADDING_PX;
    }
  }

  scrollLeft = Math.max(0, Math.min(scrollLeft, maxScroll));
  track.scrollTo({ left: scrollLeft, behavior });
}
