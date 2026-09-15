'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { ProductPhotoFrame } from '@/components/ProductPhotoFrame';
import { resolveMediaUrl } from '@/lib/media-url';
import { useCart } from '@/lib/cart-store';
import { ArrowLeft, Plus, Minus, ShieldCheck, Ruler, Maximize2, ShoppingBag } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { ColorCatalogGrid } from '@/components/ColorCatalogGrid';
import { fetchColorCatalogBySlug } from '@/lib/color-catalog';
import { ColorCatalogDTO } from '@swisswall/types';
import { getThicknessVariants, resolveProductVariant } from '@/lib/product-variants';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const locale = useLocale();
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedColorCode, setSelectedColorCode] = useState<string | null>(null);
  const [selectedThicknessMm, setSelectedThicknessMm] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
      .then((res) => {
        setProduct(res.product);
        setSelectedImageIndex(0);
      })
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

  const thicknessVariants = useMemo(
    () => (product ? getThicknessVariants(product) : []),
    [product]
  );

  useEffect(() => {
    if (!product || thicknessVariants.length === 0) {
      setSelectedThicknessMm(null);
      return;
    }
    setSelectedThicknessMm((prev) => {
      const values = thicknessVariants.map(
        (v) => (v.attributes as { thickness_mm: number }).thickness_mm
      );
      if (prev != null && values.includes(prev)) return prev;
      return values[0] ?? null;
    });
  }, [product, thicknessVariants]);

  const activeVariant = useMemo(() => {
    if (!product) return null;
    return resolveProductVariant(product, {
      colorCode: selectedColorCode,
      thicknessMm: selectedThicknessMm,
    });
  }, [product, selectedColorCode, selectedThicknessMm]);

  const displayPriceChf = activeVariant?.priceChf ?? product?.priceChf ?? 0;

  const galleryImages = useMemo(() => {
    if (!product?.images?.length) return [];
    return [...product.images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [product]);

  const activeImageUrl = galleryImages[selectedImageIndex]?.url ?? galleryImages[0]?.url;

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
    catalogSeries?: string;
  } | null;

  const displayThicknessMm = selectedThicknessMm ?? specs?.thickness_mm ?? null;
  const mustSelectColor = Boolean(colorCatalog);
  const mustSelectThickness = thicknessVariants.length > 0;

  // Translation helpers for technical specs
  const specLabels = {
    thickness: { sq: 'Trashësia', de: 'Stärke', en: 'Thickness', fr: 'Épaisseur' },
    width: { sq: 'Gjerësia', de: 'Breite', en: 'Width', fr: 'Largeur' },
    height: { sq: 'Lartësia', de: 'Höhe', en: 'Height', fr: 'Hauteur' },
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
          <div className="lg:col-span-6 space-y-4">
            <div className="relative">
              <ProductPhotoFrame
                src={activeImageUrl}
                alt={name}
                variant="detail"
                priority
                className="shadow-sm"
              />
              <span className="absolute top-4 left-4 bg-zinc-900/95 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 select-none pointer-events-none">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C8B89A]" />
                Swiss Quality
              </span>
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {galleryImages.map((img, index) => {
                  const selected = index === selectedImageIndex;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center bg-gradient-to-br from-[#FAFAF8] to-[#ECE8E1] ${
                        selected
                          ? 'border-[#C8B89A] ring-2 ring-[#C8B89A]/25'
                          : 'border-zinc-200 hover:border-zinc-300 opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`Image ${index + 1}`}
                    >
                      <img
                        src={resolveMediaUrl(img.url)}
                        alt=""
                        className="max-w-[88%] max-h-[88%] object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            )}
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
                    CHF {displayPriceChf.toFixed(2)}
                  </span>
                  <span className="text-sm text-zinc-500 font-light">{tProducts('priceUnitShort')}</span>
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
                  {displayThicknessMm != null && !mustSelectThickness && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200/30 rounded-xl">
                      <Ruler className="w-5 h-5 text-[#C8B89A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-light leading-none">{currentLabel('thickness')}</span>
                        <span className="text-xs font-semibold text-zinc-800">{displayThicknessMm} mm</span>
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

                </div>
              </div>
            </div>

            {mustSelectThickness && (
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {tProducts('selectThickness')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {thicknessVariants.map((v) => {
                    const mm = (v.attributes as { thickness_mm: number }).thickness_mm;
                    const selected = selectedThicknessMm === mm;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedThicknessMm(mm)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          selected
                            ? 'border-[#C8B89A] bg-[#C8B89A]/15 text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-[#C8B89A]/60'
                        }`}
                      >
                        {mm} mm · CHF {v.priceChf.toFixed(2)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                <div className="flex flex-col gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {tProducts('quantityPanels')}
                  </span>
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
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => addItem(product.id, qty, activeVariant?.id)}
                  disabled={
                    (mustSelectColor && !selectedColorCode) ||
                    (mustSelectThickness && selectedThicknessMm == null)
                  }
                  className="flex-grow bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] py-3.5 px-8 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  {tProducts('addToCart')}
                </button>
              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
