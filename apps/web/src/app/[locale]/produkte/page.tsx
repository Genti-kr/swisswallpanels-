'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { useCart } from '@/lib/cart-store';
import { SlidersHorizontal, Layers, Volume2, Sparkles, Plus, Search, ChevronRight } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { fetchCart, addItem } = useCart();
  const locale = useLocale();
  
  const tCommon = useTranslations('Common');
  const tProducts = useTranslations('Products');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    setLoading(true);
    let url = '/api/products?pageSize=30';
    if (activeCategory !== 'all') {
      url += `&category=${activeCategory}`;
    }
    if (searchQuery.trim() !== '') {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    apiFetch<{ items: ProductDTO[] }>(url)
      .then((res) => setProducts(res.items))
      .catch(() => {
        // Fallback
        apiFetch<{ items: ProductDTO[] }>('/api/products')
          .then((r) => setProducts(r.items));
      })
      .finally(() => setLoading(false));
  }, [activeCategory, searchQuery]);

  const categories = [
    { slug: 'all', label: { de: 'Alle Kollektionen', en: 'All Collections', fr: 'Toutes Collections', sq: 'Të Gjitha' } },
    { slug: 'akustikpaneele', label: { de: 'Akustikpaneele', en: 'Acoustic Panels', fr: 'Panneaux Acoustiques', sq: 'Panele Akustike' } },
    { slug: 'dekorationspaneele', label: { de: 'Dekorationspaneele', en: 'Decorative Panels', fr: 'Panneaux Décoratifs', sq: 'Panele Dekorative' } },
    { slug: 'holzpaneele', label: { de: 'Holzpaneele', en: 'Wood Panels', fr: 'Panneaux en Bois', sq: 'Panele Druri' } },
  ];


  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col">
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-white border-b border-zinc-100/80 py-16 px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <img src="/Enhancing-Wood-Panel-Walls.webp" alt="wood watermark" className="w-full h-full object-cover grayscale" />
          </div>
          
          <div className="max-w-7xl mx-auto text-center space-y-4 relative z-10">
            <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest block">
              {locale === 'sq' ? 'Koleksioni ynë' : 'Our Collection'}
            </span>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-900">
              {tProducts('title')}
            </h1>
            <p className="text-zinc-500 font-light text-sm max-w-xl mx-auto leading-relaxed">
              {locale === 'sq' && "Panele muri premium akustike dhe dekorative zvicerane, të krijuara për komoditet dhe dizajn modern."}
              {locale === 'de' && "Premium Schweizer Akustik- und Dekorationswandpaneele für exklusives und modernes Wohndesign."}
              {locale === 'fr' && "Panneaux muraux acoustiques et décoratifs suisses haut de gamme pour des designs intérieurs élégants."}
              {locale === 'en' && "Premium Swiss acoustic and decorative wall panels designed for modern luxury and acoustics."}
            </p>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Categories Tab list */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeCategory === cat.slug
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'bg-white border border-zinc-200/60 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                {cat.label[locale as keyof typeof cat.label] || cat.label.de}
              </button>
            ))}
          </div>

          {/* Search box */}
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

        {/* Products Grid */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          {loading ? (
            /* Pulsing Grid Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-zinc-200/50 rounded-2xl p-4 space-y-4 animate-pulse">
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
                {locale === 'sq' ? 'Ju lutemi provoni një kategori tjetër ose kërkim tjetër.' : 'Please try another category or search term.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p) => {
                const name = p.nameJson[locale as keyof typeof p.nameJson] || p.nameJson.de;
                const desc = p.descJson[locale as keyof typeof p.descJson] || p.descJson.de;
                const categorySlug = p.category?.slug || '';
                
                return (
                  <div 
                    key={p.id} 
                    className="group bg-white border border-zinc-200/40 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Product image container */}
                      <div className="aspect-[4/3] bg-[#F8F8F6] rounded-xl overflow-hidden relative">
                        {p.images[0] ? (
                          <img 
                            src={resolveMediaUrl(p.images[0].url)} 
                            alt={name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <img 
                            src="/Enhancing-Wood-Panel-Walls.webp" 
                            alt="fallback wood panel" 
                            className="w-full h-full object-cover opacity-60 mix-blend-multiply" 
                          />
                        )}
                        
                        {/* Tags / Badges */}
                        {p.isFeatured && (
                          <span className="absolute top-3 left-3 bg-[#C8B89A] text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 select-none">
                            <Sparkles className="w-3 h-3" />
                            Premium
                          </span>
                        )}
                        {p.acousticRating && (
                          <span className="absolute top-3 right-3 bg-zinc-900/90 text-white text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full backdrop-blur flex items-center gap-1 select-none">
                            <Volume2 className="w-3 h-3 text-[#C8B89A]" />
                            NRC {p.acousticRating.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Text info */}
                      <div className="mt-4 space-y-2">
                        <span className="text-[10px] font-semibold text-[#C8B89A] uppercase tracking-widest block">
                          {categorySlug === 'akustikpaneele' && (locale === 'sq' ? 'Akustikë' : 'Acoustic')}
                          {categorySlug === 'dekorationspaneele' && (locale === 'sq' ? 'Dekor' : 'Decorative')}
                          {categorySlug === 'holzpaneele' && (locale === 'sq' ? 'Druri' : 'Wood')}
                          {!categorySlug && 'Swiss Design'}
                        </span>
                        
                        <h2 className="text-lg font-light text-zinc-900 group-hover:text-[#C8B89A] transition-colors duration-300 line-clamp-1">
                          {name}
                        </h2>
                        
                        <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-2">
                          {desc}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">
                          {tProducts('pricePerM2')}
                        </span>
                        <span className="text-base font-semibold text-zinc-900">
                          CHF {p.priceChf.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/produkte/${p.slug}`} 
                          className="text-xs font-semibold text-zinc-500 hover:text-[#C8B89A] flex items-center gap-1 transition-colors"
                        >
                          {tCommon('details')}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        
                        <button 
                          onClick={() => addItem(p.id)} 
                          className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] p-2.5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center"
                          title={tProducts('addToCart')}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
