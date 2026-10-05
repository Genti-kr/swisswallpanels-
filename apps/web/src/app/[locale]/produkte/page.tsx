'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CategoryDTO, ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { fetchAllProducts } from '@/lib/fetch-all-products';
import { ProductListingCard } from '@/components/ProductListingCard';
import { useCart } from '@/lib/cart-store';
import { SlidersHorizontal, Search } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<{ slug: string; label: string }[]>([
    { slug: 'all', label: '' },
  ]);

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

        <section className="max-w-7xl mx-auto px-6 pt-12 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categoryFilters.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeCategory === cat.slug
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'bg-white border border-zinc-200/60 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                {cat.label || (cat.slug === 'all' ? tProducts('allCategories') : cat.slug)}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full flex items-center">
            <Search className="absolute left-3.5 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              placeholder={locale === 'sq' ? 'Kërko produkte...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-full pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] transition-all font-light"
            />
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24">
          {!loading && products.length > 0 ? (
            <p className="text-xs text-zinc-400 font-light mb-8 text-center md:text-left">
              {tProducts('showingCount', { count: products.length })}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p) => renderCard(p))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
