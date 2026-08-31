'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { useCart } from '@/lib/cart-store';
import { ArrowLeft, Plus, Minus, Volume2, Sparkles, ShieldCheck, Truck, Ruler, Scale, Maximize2, ShoppingBag } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { ColorCatalogGrid } from '@/components/ColorCatalogGrid';
import { fetchColorCatalogBySlug } from '@/lib/color-catalog';
import { ColorCatalogDTO } from '@swisswall/types';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const locale = useLocale();
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedColorCode, setSelectedColorCode] = useState<string | null>(null);
  const [colorCatalog, setColorCatalog] = useState<ColorCatalogDTO | null>(null);
  const { fetchCart, addItem } = useCart();
  
  const tCommon = useTranslations('Common');
  const tProducts = useTranslations('Products');
  const tCatalog = useTranslations('Catalog');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    apiFetch<{ product: ProductDTO }>(`/api/products/${slug}`)
      .then((res) => setProduct(res.product))
      .catch(console.error);
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const series = (product.specsJson as { catalogSeries?: string } | null)?.catalogSeries;
    if (!series) {
      setColorCatalog(null);
      return;
    }
    fetchColorCatalogBySlug(series).then(setColorCatalog);
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F6] text-zinc-500 gap-4">
        <svg className="animate-spin h-8 w-8 text-[#C8B89A]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs tracking-wider uppercase font-semibold">{tCommon('loading')}</span>
      </div>
    );
  }

  const name = product.nameJson[locale as keyof typeof product.nameJson] || product.nameJson.de;
  const desc = product.descJson[locale as keyof typeof product.descJson] || product.descJson.de;
  const categorySlug = product.category?.slug || '';

  // Extract specs from JSON safely
  const specs = product.specsJson as {
    thickness_mm?: number;
    width_mm?: number;
    height_mm?: number;
    weight_kg?: number;
    catalogSeries?: string;
  } | null;

  const selectedVariant = selectedColorCode
    ? product.variants.find(
        (v) => (v.attributes as { color?: string })?.color === selectedColorCode
      )
    : null;

  // Translation helpers for technical specs
  const specLabels = {
    thickness: { sq: 'Trashësia', de: 'Stärke', en: 'Thickness', fr: 'Épaisseur' },
    width: { sq: 'Gjerësia', de: 'Breite', en: 'Width', fr: 'Largeur' },
    height: { sq: 'Lartësia', de: 'Höhe', en: 'Height', fr: 'Hauteur' },
    weight: { sq: 'Pesha', de: 'Gewicht', en: 'Weight', fr: 'Poids' }
  };

  const currentLabel = (key: keyof typeof specLabels) => {
    return specLabels[key][locale as keyof typeof specLabels['thickness']] || specLabels[key].de;
  };

  const handleQtyChange = (val: number) => {
    if (val < 1) return;
    if (val > 99) return;
    setQty(val);
  };

  // Cart item count removed — handled by SiteHeader

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col">
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto py-12 px-6 w-full space-y-8">
        
        {/* Navigation Link back */}
        <Link 
          href="/produkte" 
          className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-[#C8B89A] transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'sq' ? 'Kthehu te produktet' : 'Back to products'}
        </Link>

        {/* Dual column product details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white rounded-3xl p-6 sm:p-10 md:p-12 border border-zinc-200/40 shadow-sm">
          
          {/* Left Column: Image Display */}
          <div className="lg:col-span-6 space-y-6">
            <div className="aspect-square bg-[#F8F8F6] rounded-2xl overflow-hidden border border-zinc-100 shadow-sm relative">
              {product.images[0] ? (
                <img 
                  src={resolveMediaUrl(product.images[0].url)} 
                  alt={name} 
                  className="w-full h-full object-cover hover:scale-102 transition-transform duration-500" 
                />
              ) : (
                <img 
                  src="/Enhancing-Wood-Panel-Walls.webp" 
                  alt="fallback wood panel" 
                  className="w-full h-full object-cover opacity-60 mix-blend-multiply" 
                />
              )}

              {/* Badges on image */}
              <span className="absolute top-4 left-4 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 select-none">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C8B89A]" />
                Swiss Quality
              </span>
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            
            <div className="space-y-6">
              {/* Category tag */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#C8B89A] uppercase tracking-widest block">
                  {categorySlug === 'akustikpaneele' && (locale === 'sq' ? 'Panele Akustike' : 'Acoustic Panels')}
                  {categorySlug === 'dekorationspaneele' && (locale === 'sq' ? 'Panele Dekorative' : 'Decorative Panels')}
                  {categorySlug === 'holzpaneele' && (locale === 'sq' ? 'Panele Druri' : 'Wood Panels')}
                  {!categorySlug && 'Collection'}
                </span>
                
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-light text-zinc-900 tracking-tight leading-tight">
                  {name}
                </h1>
              </div>

              {/* Price card */}
              <div className="bg-[#F8F8F6]/80 border border-zinc-200/40 rounded-2xl p-5 flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-zinc-900">
                    CHF {product.priceChf.toFixed(2)}
                  </span>
                  <span className="text-sm text-zinc-500 font-light">/ m²</span>
                </div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1 font-semibold">
                  {locale === 'sq' ? 'Çmimi përfshin TVSH-në (8.1%)' : 'Price incl. 8.1% VAT'}
                </span>
              </div>

              {/* Description */}
              <p className="text-zinc-500 font-light text-sm leading-relaxed">
                {desc}
              </p>

              {/* Technical Specifications Grid */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {locale === 'sq' ? 'Specifikimet Teknike' : 'Technical Specifications'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Thickness */}
                  {specs?.thickness_mm && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200/30 rounded-xl">
                      <Ruler className="w-5 h-5 text-[#C8B89A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-light leading-none">{currentLabel('thickness')}</span>
                        <span className="text-xs font-semibold text-zinc-800">{specs.thickness_mm} mm</span>
                      </div>
                    </div>
                  )}

                  {/* Width & Height */}
                  {specs?.width_mm && specs?.height_mm && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200/30 rounded-xl">
                      <Maximize2 className="w-5 h-5 text-[#C8B89A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-light leading-none">
                          {locale === 'sq' ? 'Dimensionet' : 'Dimensions'}
                        </span>
                        <span className="text-xs font-semibold text-zinc-800">{specs.width_mm} × {specs.height_mm} mm</span>
                      </div>
                    </div>
                  )}

                  {/* Weight */}
                  {specs?.weight_kg && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200/30 rounded-xl">
                      <Scale className="w-5 h-5 text-[#C8B89A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-light leading-none">{currentLabel('weight')}</span>
                        <span className="text-xs font-semibold text-zinc-800">{specs.weight_kg} kg</span>
                      </div>
                    </div>
                  )}

                  {/* Acoustic Rating / NRC */}
                  {product.acousticRating && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200/30 rounded-xl">
                      <Volume2 className="w-5 h-5 text-[#C8B89A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-light leading-none">
                          {locale === 'sq' ? 'Përthithja' : 'Acoustics'}
                        </span>
                        <span className="text-xs font-semibold text-zinc-800">NRC {product.acousticRating.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {colorCatalog && (
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {tCatalog('selectColor')}
                  </h3>
                  <Link
                    href="/katalog"
                    className="text-[10px] font-semibold uppercase tracking-wider text-[#C8B89A] hover:underline"
                  >
                    {tCatalog('viewCatalog')}
                  </Link>
                </div>
                <ColorCatalogGrid
                  catalog={colorCatalog}
                  compact
                  selectedCode={selectedColorCode}
                  onSelect={setSelectedColorCode}
                />
                {selectedColorCode && (
                  <p className="text-xs text-zinc-500">
                    {tCatalog('selectedColor')}: <span className="font-semibold text-zinc-800">{selectedColorCode}</span>
                  </p>
                )}
              </div>
            )}

            {/* Quantity and Actions Bar */}
            <div className="space-y-6 pt-6 border-t border-zinc-100">
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                
                {/* Custom Quantity Buttons */}
                <div className="flex items-center border border-zinc-200 bg-zinc-50 rounded-xl p-1 shrink-0 w-fit">
                  <button 
                    type="button" 
                    onClick={() => handleQtyChange(qty - 1)}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold select-none">
                    {qty}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleQtyChange(qty + 1)}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => addItem(product.id, qty, selectedVariant?.id)}
                  disabled={Boolean(colorCatalog) && !selectedColorCode}
                  className="flex-grow bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] py-3.5 px-8 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  {tProducts('addToCart')}
                </button>
              </div>

              {/* Trust Badges Bar */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-6">
                <div className="flex items-start gap-2.5">
                  <Truck className="w-5 h-5 text-[#C8B89A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 block leading-tight">
                      {locale === 'sq' ? 'Transport i Shpejtë' : 'Fast Delivery'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
                      {locale === 'sq' ? 'Falas mbi 500 CHF në Zvicër' : 'Free above CHF 500 in CH'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#C8B89A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 block leading-tight">
                      {locale === 'sq' ? 'Kthim i Lehtë' : 'Easy Returns'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
                      {locale === 'sq' ? 'Garantuar brenda 14 ditëve' : 'Guaranteed for 14 days'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
