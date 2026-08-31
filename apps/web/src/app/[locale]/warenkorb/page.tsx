'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart-store';
import { resolveMediaUrl } from '@/lib/media-url';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Truck,
  ShoppingBag
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';

export default function CartPage() {
  const { cart, fetchCart, updateItem, removeItem, loading } = useCart();
  const locale = useLocale();
  
  const t = useTranslations();
  const tCart = useTranslations('Cart');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, i) => sum + i.product.priceChf * i.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : 29;
  const total = subtotal + shipping;

  const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 2
    }).format(value).replace(/\s+/g, ' ').replace(/’/g, "'");
  };

  const showSkeleton = loading && !cart;

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col justify-between">
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-white border-b border-zinc-100/80 py-12 px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <img src="/Enhancing-Wood-Panel-Walls.webp" alt="wood watermark" className="w-full h-full object-cover grayscale" />
          </div>
          
          <div className="max-w-7xl mx-auto text-center space-y-2 relative z-10">
            <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest block">
              {locale === 'sq' ? 'Përmbledhja juaj' : 'Your Summary'}
            </span>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-900">
              {tCart('title')}
            </h1>
          </div>
        </section>

        {/* Content Container */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          {showSkeleton ? (
            /* Pulsing Grid Skeletons */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="bg-white border border-zinc-200/50 rounded-2xl p-5 flex gap-5 items-center animate-pulse">
                    <div className="w-24 h-24 bg-zinc-100 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-zinc-100 rounded w-1/3" />
                      <div className="h-3 bg-zinc-100 rounded w-1/4" />
                      <div className="h-3 bg-zinc-100 rounded w-1/5" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 h-64 animate-pulse space-y-4">
                <div className="h-4 bg-zinc-100 rounded w-1/2" />
                <div className="h-10 bg-zinc-100 rounded" />
                <div className="h-4 bg-zinc-100 rounded w-3/4" />
              </div>
            </div>
          ) : items.length === 0 ? (
            /* Empty Cart State */
            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200/50 shadow-sm max-w-lg mx-auto px-6 space-y-6">
              <div className="w-16 h-16 bg-[#F8F8F6] rounded-full flex items-center justify-center mx-auto text-[#C8B89A] border border-zinc-100 shadow-inner">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-light text-zinc-800">
                  {tCart('empty')}
                </h3>
                <p className="text-zinc-400 text-xs font-light leading-relaxed max-w-sm mx-auto">
                  {locale === 'sq' && 'Shfletoni koleksionet tona për të gjetur panele muri akustike ose dekorative që i përshtaten stilit tuaj.'}
                  {locale === 'de' && 'Stöbern Sie in unseren Kollektionen, um passende akustische oder dekorative Wandpaneele für Ihren Stil zu finden.'}
                  {locale === 'en' && 'Browse our collections to find acoustic or decorative wall panels that suit your style.'}
                  {locale === 'fr' && 'Parcourez nos collections pour trouver des panneaux muraux acoustiques ou décoratifs adaptés à votre style.'}
                </p>
              </div>
              <div className="pt-4">
                <Link 
                  href="/produkte" 
                  className="inline-block bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm"
                >
                  {tCart('continueShopping')}
                </Link>
              </div>
            </div>
          ) : (
            /* Filled Cart Content */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Cart Items List */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => {
                  const name = item.product.nameJson[locale as keyof typeof item.product.nameJson] || item.product.nameJson.de;
                  const itemTotalFormatted = formatCHF(item.product.priceChf * item.quantity);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="group bg-white rounded-2xl border border-zinc-200/50 p-5 flex flex-col sm:flex-row gap-5 items-center hover:shadow-lg transition-all duration-300 relative"
                    >
                      {/* Image */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#F8F8F6] rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0">
                        {item.product.images[0] ? (
                          <img 
                            src={resolveMediaUrl(item.product.images[0].url)} 
                            alt={name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <img 
                            src="/Enhancing-Wood-Panel-Walls.webp" 
                            alt="fallback wood panel" 
                            className="w-full h-full object-cover opacity-60 grayscale" 
                          />
                        )}
                      </div>
                      
                      {/* Name and Price */}
                      <div className="flex-grow text-center sm:text-left space-y-1.5">
                        <h3 className="font-medium text-zinc-900 text-base sm:text-lg group-hover:text-[#C8B89A] transition-colors duration-300">
                          {name}
                        </h3>
                        <div className="text-sm text-zinc-400 font-light">
                          CHF {item.product.priceChf.toFixed(2)}/m²
                        </div>
                        <div className="text-sm font-semibold text-zinc-800 pt-1">
                          {t('Common.total')}: {itemTotalFormatted}
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-zinc-200 rounded-xl bg-[#F8F8F6] p-1 shadow-inner">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateItem(item.id, item.quantity - 1);
                              }
                            }}
                            disabled={item.quantity <= 1 || loading}
                            className="p-1.5 rounded-lg hover:bg-zinc-200/70 disabled:opacity-30 transition-all text-zinc-600 cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-zinc-800 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              updateItem(item.id, item.quantity + 1);
                            }}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-zinc-200/70 disabled:opacity-30 transition-all text-zinc-600 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Remove Button */}
                        <button 
                          onClick={() => removeItem(item.id)} 
                          disabled={loading}
                          className="text-zinc-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100 flex items-center justify-center"
                          title={t('Common.delete')}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary sidebar */}
              <div className="space-y-6">
                {/* Shipping progress indicator */}
                {subtotal < 500 && (
                  <div className="bg-zinc-50 border border-zinc-200/50 rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-xs font-medium text-zinc-600">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#C8B89A]" />
                        {locale === 'sq' && 'Transport pa pagesë'}
                        {locale === 'de' && 'Kostenloser Versand'}
                        {locale === 'en' && 'Free Shipping'}
                        {locale === 'fr' && 'Livraison gratuite'}
                      </span>
                      <span>{formatCHF(subtotal)} / {formatCHF(500)}</span>
                    </div>
                    <div className="w-full bg-zinc-200/60 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-[#C8B89A] h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(subtotal / 500) * 100}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                      {locale === 'sq' && `Shtoni edhe ${formatCHF(500 - subtotal)} për transport falas!`}
                      {locale === 'de' && `Noch ${formatCHF(500 - subtotal)} hinzufügen für kostenlosen Versand!`}
                      {locale === 'en' && `Add another ${formatCHF(500 - subtotal)} for free shipping!`}
                      {locale === 'fr' && `Ajoutez encore ${formatCHF(500 - subtotal)} pour la livraison gratuite !`}
                    </p>
                  </div>
                )}
                
                {subtotal >= 500 && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3 shadow-sm">
                    <div className="bg-emerald-500 text-white p-1 rounded-full flex-shrink-0 mt-0.5 animate-pulse">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                        {locale === 'sq' && 'Kualifikoheni për transport falas'}
                        {locale === 'de' && 'Kostenloser Versand aktiv'}
                        {locale === 'en' && 'You qualify for free shipping'}
                        {locale === 'fr' && 'Livraison gratuite éligible'}
                      </h4>
                      <p className="text-[11px] text-emerald-600/80 font-light mt-0.5">
                        {locale === 'sq' && 'Porosia juaj e kalon kufirin prej CHF 500.00.'}
                        {locale === 'de' && 'Ihre Bestellung übersteigt den Grenzwert von CHF 500.00.'}
                        {locale === 'en' && 'Your order exceeds the CHF 500.00 threshold.'}
                        {locale === 'fr' && 'Votre commande dépasse le seuil de CHF 500.00.'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Cost summary card */}
                <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-sm sticky top-28 space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-800 border-b border-zinc-100 pb-3">
                    {tCart('orderSummary')}
                  </h3>
                  
                  <div className="space-y-4 text-sm font-light">
                    <div className="flex justify-between text-zinc-500">
                      <span>{tCart('subtotal')}</span>
                      <span className="font-semibold text-zinc-800">{formatCHF(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-zinc-500">
                      <span>{tCart('shipping')}</span>
                      <span className="font-semibold text-zinc-800">
                        {shipping === 0 ? (
                          <span className="text-emerald-600 font-semibold uppercase tracking-wider text-xs">
                            {tCart('free')}
                          </span>
                        ) : (
                          formatCHF(shipping)
                        )}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-zinc-400 border-t border-zinc-100/80 pt-3">
                      {tCart('estimatedShipping')}
                    </div>
                    
                    <div className="h-px bg-zinc-100 my-4" />
                    
                    <div className="flex justify-between items-baseline text-base font-semibold text-zinc-900">
                      <span>{t('Common.total')}</span>
                      <span className="text-xl font-bold text-[#1A1A1A]">
                        {formatCHF(total)}
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-zinc-400 text-right leading-none mt-1">
                      {locale === 'sq' && 'Përfshin 8.1% TVSH zvicerane'}
                      {locale === 'de' && 'Inklusive 8.1% Schweizer MwSt.'}
                      {locale === 'en' && 'Includes 8.1% Swiss VAT'}
                      {locale === 'fr' && 'TVA suisse de 8.1% incluse'}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Link 
                      href="/checkout" 
                      className="block w-full text-center bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      {tCart('checkout')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white/50 text-xs py-12 px-6 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-white font-bold tracking-tight text-sm">
            Swiss<span className="font-light text-[#C8B89A]">Wall</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/agb" className="hover:text-white">{t('Footer.terms')}</Link>
            <Link href="/widerruf" className="hover:text-white">{t('Footer.withdrawal')}</Link>
            <Link href="/datenschutz" className="hover:text-white">{t('Footer.privacy')}</Link>
            <Link href="/impressum" className="hover:text-white">{t('Footer.imprint')}</Link>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Swiss Wall Panels. {t('Footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  );
}
