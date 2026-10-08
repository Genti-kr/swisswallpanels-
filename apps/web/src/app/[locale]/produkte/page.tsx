'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CategoryDTO, ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { fetchAllProducts } from '@/lib/fetch-all-products';
import {
  getCatalogPageCount,
  getCatalogPageSlice,
  scrollToCatalogAnchor,
} from '@/lib/products-catalog';
import { ProductListingCard } from '@/components/ProductListingCard';
import { ProductsCatalogPager } from '@/components/ProductsCatalogPager';
import { useCart } from '@/lib/cart-store';
import { SlidersHorizontal, Search, X, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<{ slug: string; label: string }[]>([
    { slug: 'all', label: '' },
  ]);
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogScrollAnchorRef = useRef<HTMLDivElement>(null);
  const pendingCategoryScrollRef = useRef(false);

  const { fetchCart, addItem } = useCart();
  const locale = useLocale();

  const tProducts = useTranslations('Products');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    apiFetch<{ items: CategoryDTO[] }>('/api/categories')
      .then((res) => {
        const loc = locale as keyof CategoryDTO['nameJson'];
        const fromApi = res.items.map((c) => ({
          slug: c.slug,
          label: c.nameJson[loc] || c.nameJson.de || c.nameJson.en || c.slug,
        }));
        setCategoryFilters([{ slug: 'all', label: tProducts('allCategories') }, ...fromApi]);
      })
      .catch(() => {
        setCategoryFilters([{ slug: 'all', label: tProducts('allCategories') }]);
      });
  }, [locale, tProducts]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== 'all') {
      params.set('category', activeCategory);
    }
    if (searchQuery.trim() !== '') {
      params.set('search', searchQuery.trim());
    }
    const qs = params.toString();
    const path = qs ? `/api/products?${qs}` : '/api/products';

    fetchAllProducts(path)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    setCatalogPage(1);
  }, [activeCategory, searchQuery]);

  const visibleProducts = useMemo(
    () => getCatalogPageSlice(products, catalogPage),
    [products, catalogPage]
  );

  const handleCatalogPageChange = (page: number) => {
    setCatalogPage(page);
    requestAnimationFrame(() => scrollToCatalogAnchor(catalogScrollAnchorRef.current));
  };

  const handleCategoryChange = (slug: string) => {
    if (slug === activeCategory) return;
    pendingCategoryScrollRef.current = true;
    setActiveCategory(slug);
    requestAnimationFrame(() => scrollToCatalogAnchor(catalogScrollAnchorRef.current));
  };

  useEffect(() => {
    if (!loading && pendingCategoryScrollRef.current) {
      pendingCategoryScrollRef.current = false;
      requestAnimationFrame(() => scrollToCatalogAnchor(catalogScrollAnchorRef.current));
    }
  }, [loading]);

  const categoryLabelForProduct = (p: ProductDTO) => {
    if (!p.category) return 'Swiss Design';
    const loc = locale as keyof CategoryDTO['nameJson'];
    return (
      p.category.nameJson[loc] ||
      p.category.nameJson.de ||
      p.category.nameJson.en ||
      p.category.slug
    );
  };

  const renderCard = (p: ProductDTO) => (
    <ProductListingCard
      key={p.id}
      product={p}
      locale={locale}
      categoryLabel={categoryLabelForProduct(p)}
      priceLabel={tProducts('pricePerM2')}
      addToCartLabel={tProducts('addToCart')}
      onAddToCart={addItem}
    />
  );

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col">
      <SiteHeader />

      <main className="flex-grow">
        <section className="bg-white border-b border-zinc-100/80 py-16 px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <img
              src="/Enhancing-Wood-Panel-Walls.webp"
              alt="wood watermark"
              className="w-full h-full object-cover grayscale"
            />
          </div>

          <div className="max-w-7xl mx-auto text-center space-y-4 relative z-10">
            <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest block">
              {locale === 'sq' ? 'Koleksioni ynë' : 'Our Collection'}
            </span>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-900">
              {tProducts('title')}
            </h1>
            <p className="text-zinc-500 font-light text-sm max-w-xl mx-auto leading-relaxed">
              {locale === 'sq' &&
                'Panele muri premium akustike dhe dekorative zvicerane, të krijuara për komoditet dhe dizajn modern.'}
              {locale === 'de' &&
                'Premium Schweizer Akustik- und Dekorationswandpaneele für exklusives und modernes Wohndesign.'}
              {locale === 'fr' &&
                'Panneaux muraux acoustiques et décoratifs suisses haut de gamme pour des designs intérieurs élégants.'}
              {locale === 'en' &&
                'Premium Swiss acoustic and decorative wall panels designed for modern luxury and acoustics.'}
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pt-10 pb-8">
          <div className="bg-white rounded-2xl border border-zinc-200/50 shadow-sm p-5 sm:p-6 flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#C8B89A]" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8B89A]">
                  {tProducts('filterCategories')}
                </span>
              </div>
              <div className="relative -mx-1">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent sm:hidden"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent sm:hidden"
                  aria-hidden
                />
                <div className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 px-1 scrollbar-none overscroll-x-contain">
                  {categoryFilters.map((cat) => {
                    const active = activeCategory === cat.slug;
                    const label =
                      cat.label || (cat.slug === 'all' ? tProducts('allCategories') : cat.slug);
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => handleCategoryChange(cat.slug)}
                        className={`shrink-0 px-4 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                          active
                            ? 'bg-[#1A1A1A] text-white shadow-md ring-2 ring-[#C8B89A]/40 ring-offset-2 ring-offset-white'
                            : 'bg-[#F8F8F6] text-zinc-600 border border-zinc-200/70 hover:border-[#C8B89A]/50 hover:text-zinc-900 hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:w-[min(100%,22rem)] shrink-0 lg:border-l lg:border-zinc-100 lg:pl-8 flex flex-col justify-center space-y-3">
              <label
                htmlFor="products-search"
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8B89A]"
              >
                <Search className="w-3.5 h-3.5" aria-hidden />
                {tProducts('searchLabel')}
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none"
                  aria-hidden
                />
                <input
                  id="products-search"
                  type="search"
                  placeholder={tProducts('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F8F8F6] border border-zinc-200/80 rounded-xl pl-10 pr-10 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-[#C8B89A] focus:ring-2 focus:ring-[#C8B89A]/25 transition-all font-light"
                />
                {searchQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                    aria-label={locale === 'sq' ? 'Pastro kërkimin' : 'Clear search'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div
            ref={catalogScrollAnchorRef}
            className="scroll-mt-28 h-0 w-full pointer-events-none"
            aria-hidden
          />
          {!loading && products.length > 0 ? (
            <p className="text-xs text-zinc-400 font-light mb-8 text-center md:text-left">
              {tProducts('showingCount', { count: products.length })}
              {products.length > visibleProducts.length
                ? ` · ${tProducts('catalogPageLabel', {
                    current: catalogPage,
                    total: getCatalogPageCount(products.length),
                  })}`
                : null}
            </p>
          ) : null}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-zinc-200/50 rounded-2xl p-4 space-y-4 animate-pulse"
                >
                  <div className="aspect-[4/3] bg-zinc-100 rounded-xl" />
                  <div className="h-5 bg-zinc-100 rounded w-2/3" />
                  <div className="h-4 bg-zinc-100 rounded w-full" />
                  <div className="h-4 bg-zinc-100 rounded w-4/5" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-5 bg-zinc-100 rounded w-1/4" />
                    <div className="h-8 bg-zinc-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm max-w-lg mx-auto">
              <SlidersHorizontal className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-light text-zinc-800">
                {locale === 'sq' ? 'Nuk u gjet asnjë produkt' : 'No products found'}
              </h3>
              <p className="text-zinc-400 text-xs font-light mt-1">
                {locale === 'sq'
                  ? 'Ju lutemi provoni një kategori tjetër ose kërkim tjetër.'
                  : 'Please try another category or search term.'}
              </p>
            </div>
          ) : (
            <>
              <div
                key={catalogPage}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300"
              >
                {visibleProducts.map((p) => renderCard(p))}
              </div>
              <ProductsCatalogPager
                totalProducts={products.length}
                currentPage={catalogPage}
                onPageChange={handleCatalogPageChange}
                labels={{
                  page: tProducts('catalogPagerHint'),
                  prev: tProducts('catalogPrev'),
                  next: tProducts('catalogNext'),
                }}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
