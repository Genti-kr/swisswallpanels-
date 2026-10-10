'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductsCatalogPager } from '@/components/ProductsCatalogPager';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  FALLBACK_GALLERY_IMAGES,
  mapGalleryImagesFromApi,
  type GalleryImageItem,
} from '@/lib/gallery-images';
import {
  getCatalogPageCount,
  getCatalogPageSlice,
  PRODUCTS_CATALOG_PAGE_SIZE,
  scrollToCatalogAnchor,
} from '@/lib/products-catalog';
import type { SiteImageDTO } from '@swisswall/types';
import { LayoutGrid } from 'lucide-react';

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImageItem[]>(FALLBACK_GALLERY_IMAGES);
  const [loading, setLoading] = useState(true);
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogScrollAnchorRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const tGallery = useTranslations('Gallery');

  const loadImages = useCallback(() => {
    setLoading(true);
    apiFetch<{ gallery: SiteImageDTO[] }>('/api/site/images')
      .then((res) => {
        if (res.gallery?.length) {
          setImages(mapGalleryImagesFromApi(res.gallery, locale, resolveMediaUrl));
        } else {
          setImages(FALLBACK_GALLERY_IMAGES);
        }
      })
      .catch(() => setImages(FALLBACK_GALLERY_IMAGES))
      .finally(() => setLoading(false));
  }, [locale]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadImages();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadImages]);

  useEffect(() => {
    const maxPage = getCatalogPageCount(images.length);
    if (maxPage > 0 && catalogPage > maxPage) {
      setCatalogPage(maxPage);
    }
  }, [images.length, catalogPage]);

  const visibleImages = useMemo(
    () => getCatalogPageSlice(images, catalogPage),
    [images, catalogPage]
  );

  const handleCatalogPageChange = (page: number) => {
    setCatalogPage(page);
    requestAnimationFrame(() => scrollToCatalogAnchor(catalogScrollAnchorRef.current));
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col">
      <SiteHeader />

      <main className="flex-grow">
        <section className="bg-white border-b border-zinc-100/80 py-16 px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <img
              src="/Enhancing-Wood-Panel-Walls.webp"
              alt=""
              className="w-full h-full object-cover grayscale"
            />
          </div>

          <div className="max-w-7xl mx-auto text-center space-y-4 relative z-10">
            <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest block">
              {tGallery('pageBadge')}
            </span>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-900">
              {tGallery('pageTitle')}
            </h1>
            <p className="text-zinc-500 font-light text-sm max-w-xl mx-auto leading-relaxed">
              {tGallery('pageSubtitle')}
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24 pt-10">
          <div
            ref={catalogScrollAnchorRef}
            className="scroll-mt-28 h-0 w-full pointer-events-none"
            aria-hidden
          />

          {!loading && images.length > 0 ? (
            <p className="text-xs text-zinc-400 font-light mb-8 text-center md:text-left">
              {tGallery('showingCount', { count: images.length })}
              {images.length > visibleImages.length
                ? ` · ${tGallery('catalogPageLabel', {
                    current: catalogPage,
                    total: getCatalogPageCount(images.length),
                  })}`
                : null}
            </p>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] bg-white border border-zinc-200/50 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm max-w-lg mx-auto">
              <LayoutGrid className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h2 className="text-lg font-light text-zinc-800">{tGallery('emptyTitle')}</h2>
              <p className="text-zinc-400 text-xs font-light mt-1">{tGallery('emptyHint')}</p>
            </div>
          ) : (
            <>
              <div
                key={catalogPage}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300"
              >
                {visibleImages.map((img) => (
                  <figure
                    key={img.id}
                    className="aspect-[4/3] bg-white border border-zinc-100 rounded-lg overflow-hidden group relative shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <figcaption className="sr-only">{img.alt}</figcaption>
                  </figure>
                ))}
              </div>

              <ProductsCatalogPager
                totalProducts={images.length}
                currentPage={catalogPage}
                onPageChange={handleCatalogPageChange}
                pageSize={PRODUCTS_CATALOG_PAGE_SIZE}
                labels={{
                  page: tGallery('catalogPagerHint'),
                  prev: tGallery('catalogPrev'),
                  next: tGallery('catalogNext'),
                }}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
