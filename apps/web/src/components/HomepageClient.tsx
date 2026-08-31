'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import FeaturedProducts from '@/components/FeaturedProducts';
import { SiteHeader } from '@/components/SiteHeader';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { SiteImageDTO } from '@swisswall/types';

const fallbackGallery = [
  { src: '/Enhancing-Wood-Panel-Walls.webp', alt: 'Wood panel wall decoration' },
  { src: '/balsa_02.webp', alt: 'Balsa wood panels close-up' },
  { src: '/images.jpg', alt: 'Acoustic oak wood panels' },
  { src: '/imagess.jpg', alt: 'Decorative pine wood panels' },
];

const fallbackAbout = '/balsa_02.webp';

const fallbackProducts = [
  {
    id: 'fallback-1',
    name: { de: 'Eiche Akustik Pro', en: 'Oak Acoustic Pro', fr: 'Chêne Acoustique Pro', sq: 'Lisi Akustik Pro' },
    priceChf: 89.00,
    slug: 'eiche-akustik-pro'
  },
  {
    id: 'fallback-2',
    name: { de: 'Nussbaum Dekor', en: 'Walnut Decor', fr: 'Noyer Décor', sq: 'Arra Dekor' },
    priceChf: 72.00,
    slug: 'nussbaum-dekor'
  },
  {
    id: 'fallback-3',
    name: { de: 'Kiefer Natur', en: 'Natural Pine', fr: 'Pin Naturel', sq: 'Pishë Natyrale' },
    priceChf: 58.00,
    slug: 'kiefer-natur'
  }
];

export default function HomepageClient() {
  const t = useTranslations();
  const tContact = useTranslations('Contact');
  const tCalc = useTranslations('Calculator');
  const tCTA = useTranslations('CTA');
  const locale = useLocale();

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [galleryImages, setGalleryImages] = useState<{ src: string; alt: string }[]>(fallbackGallery);
  const [aboutImage, setAboutImage] = useState<string>(fallbackAbout);
  const [heroBg, setHeroBg] = useState(fallbackGallery[0].src);
  const [heroBgVisible, setHeroBgVisible] = useState(true);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    apiFetch<{ gallery: SiteImageDTO[]; about: SiteImageDTO[] }>('/api/site/images')
      .then((res) => {
        if (res.gallery?.length) {
          const mapped = res.gallery.map((img) => ({
            src: resolveMediaUrl(img.url),
            alt:
              (img.altJson as Record<string, string> | null)?.[locale] ||
              (img.altJson as Record<string, string> | null)?.de ||
              'Gallery image',
          }));
          setGalleryImages(mapped);
          setHeroBg(mapped[0].src);
          setHeroBgVisible(true);
        }
        if (res.about?.length) {
          const about = res.about[0];
          const aboutUrl = resolveMediaUrl(about.url);
          setAboutImage(aboutUrl);
          if (!res.gallery?.length) {
            setHeroBg(aboutUrl);
            setHeroBgVisible(true);
          }
        }
      })
      .catch(() => { });
  }, [locale]);

  useEffect(() => {
    apiFetch<{ items: any[] }>('/api/products')
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setProducts(res.items);
          setSelectedProductId(res.items[0].id);
        } else {
          setProducts(fallbackProducts);
          setSelectedProductId(fallbackProducts[0].id);
        }
      })
      .catch(() => {
        setProducts(fallbackProducts);
        setSelectedProductId(fallbackProducts[0].id);
      });
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedPrice = selectedProduct ? Number(selectedProduct.priceChf) : 89;

  const vatRate = 0.081; // 8.1% Swiss VAT
  const subtotal = selectedPrice * quantity;
  const vatAmount = subtotal * vatRate;
  const totalCost = subtotal + vatAmount;

  // Swiss currency formatter
  const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 2
    }).format(value).replace(/\s+/g, ' ').replace(/’/g, "'");
  };

  const getSelectedProductName = () => {
    if (!selectedProduct) return 'Product';
    if (selectedProduct.nameJson) {
      return selectedProduct.nameJson[locale as keyof typeof selectedProduct.nameJson] || selectedProduct.nameJson.de;
    }
    return selectedProduct.name[locale as keyof typeof selectedProduct.name] || selectedProduct.name.de;
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteStatus('loading');
    try {
      await apiFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          contactName: quoteName.trim(),
          contactEmail: quoteEmail.trim().toLowerCase(),
          contactPhone: quotePhone.trim() || null,
          projectDesc: `Homepage calculator quote — ${quantity} m²`,
          productId: selectedProductId.startsWith('fallback') ? undefined : selectedProductId,
          productName: getSelectedProductName(),
          quantity,
          estimatedTotalChf: totalCost,
          language: locale,
        }),
      });
      setQuoteStatus('success');
      setQuoteName('');
      setQuoteEmail('');
      setQuotePhone('');
    } catch {
      setQuoteStatus('error');
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterStatus('loading');
    try {
      await apiFetch('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          email: newsletterEmail.trim().toLowerCase(),
          language: locale,
        }),
      });
      setNewsletterStatus('success');
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('error');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('loading');
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim().toLowerCase(),
          phone: contactPhone.trim() || null,
          subject: contactSubject.trim(),
          message: contactMessage.trim(),
          language: locale,
        }),
      });
      setContactStatus('success');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactSubject('');
      setContactMessage('');
    } catch {
      setContactStatus('error');
    }
  };

  return (
    <div className="flex-grow flex flex-col font-sans bg-white text-[#1A1A1A]">
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Section 1: Hero */}
        <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 py-20 text-center overflow-hidden bg-[#F8F8F6]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            {heroBgVisible && (
              <img
                src={heroBg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.22] saturate-[0.65]"
                onError={() => setHeroBgVisible(false)}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 50% 145%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.99) 50%, rgba(255, 255, 255, 0.95) 80%, rgba(248, 248, 246, 0.92) 100%)'
              }}
            />
          </div>

          {/* Animated background lines / decorative elements */}
          <div className="absolute inset-0 opacity-5 pointer-events-none z-10">
            <div className="absolute left-1/4 top-0 w-px h-full bg-[#1A1A1A]" />
            <div className="absolute right-1/4 top-0 w-px h-full bg-[#1A1A1A]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8B89A]">
              {t('Hero.badge')}
            </span>
            <h1 className="text-5xl md:text-7xl font-light tracking-tight text-[#1A1A1A]">
              {t('Hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-[#1A1A1A]/60 max-w-2xl mx-auto font-light leading-relaxed">
              {t('Hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href="/produkte"
                className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-4 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-300"
              >
                {t('Hero.viewProducts')}
              </Link>
              <Link
                href="#calculator"
                className="border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white px-8 py-4 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-300"
              >
                {t('Hero.getQuote')}
              </Link>
            </div>
          </div>
        </section>

        {/* Section 2: Trust pillars (no unverified statistics) */}
        <section className="bg-[#1A1A1A] text-white py-12 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#C8B89A]">{t('TrustPillars.quality')}</div>
              <p className="text-xs text-white/50 leading-relaxed">{t('TrustPillars.qualityDesc')}</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#C8B89A]">{t('TrustPillars.delivery')}</div>
              <p className="text-xs text-white/50 leading-relaxed">{t('TrustPillars.deliveryDesc')}</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#C8B89A]">{t('TrustPillars.expertise')}</div>
              <p className="text-xs text-white/50 leading-relaxed">{t('TrustPillars.expertiseDesc')}</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#C8B89A]">{t('TrustPillars.swiss')}</div>
              <p className="text-xs text-white/50 leading-relaxed">{t('TrustPillars.swissDesc')}</p>
            </div>
          </div>
        </section>

        {/* Section 3: Featured Products */}
        <section id="products" className="py-24 px-6 max-w-7xl mx-auto space-y-16 bg-white">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">{t('Products.featured')}</h2>
            <div className="w-16 h-0.5 bg-[#C8B89A] mx-auto" />
          </div>

          <FeaturedProducts />

          <div className="text-center">
            <Link href="/produkte" className="text-[#C8B89A] hover:underline text-sm uppercase tracking-wider">
              {t('Hero.viewProducts')} →
            </Link>
          </div>
        </section>

        {/* Section 4: Live m² Price Calculator */}
        <section id="calculator" className="bg-zinc-50 py-24 px-6 border-y border-zinc-100">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-light tracking-tight">{t('Calculator.title')}</h2>
              <p className="text-sm text-[#1A1A1A]/60 max-w-xl mx-auto">
                {t('Calculator.subtitle')}
              </p>
            </div>

            <div className="bg-white border border-zinc-200/85 rounded-xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/60">
                    {t('Calculator.selectPanelLabel')}
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                  >
                    {products.map((p) => {
                      const name = p.nameJson
                        ? (p.nameJson[locale as keyof typeof p.nameJson] || p.nameJson.de)
                        : (p.name[locale as keyof typeof p.name] || p.name.de);
                      return (
                        <option key={p.id} value={p.id}>
                          {name} ({formatCHF(Number(p.priceChf))} / m²)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/60">
                    {t('Calculator.quantityLabel')}
                  </label>
                  <input
                    type="number"
                    value={quantity || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuantity(0);
                        return;
                      }
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setQuantity(Math.min(1000, Math.max(1, num)));
                      }
                    }}
                    onBlur={() => {
                      if (!quantity || quantity < 1) {
                        setQuantity(1);
                      }
                    }}
                    min={1}
                    max={1000}
                    className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                  />
                </div>

                <div className="bg-[#1A1A1A] text-white p-4 rounded flex justify-between items-center">
                  <span className="text-sm font-medium">{t('Calculator.total')}</span>
                  <span className="text-lg font-bold text-[#C8B89A]">{formatCHF(totalCost)}</span>
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l border-[#1A1A1A]/10 pt-6 md:pt-0 md:pl-8 space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/60">
                  {t('Calculator.breakdownTitle')}
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#1A1A1A]/65">{t('Calculator.materialBase', { quantity, price: formatCHF(selectedPrice) })}</span>
                    <span className="font-medium">{formatCHF(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1A1A1A]/65">{t('Calculator.vatLabel')}</span>
                    <span className="font-medium">{formatCHF(vatAmount)}</span>
                  </div>
                  <div className="h-px bg-[#1A1A1A]/10 my-2" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>{t('Calculator.totalCost')}</span>
                    <span>{formatCHF(totalCost)}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  {!showQuoteForm ? (
                    <button
                      type="button"
                      onClick={() => setShowQuoteForm(true)}
                      className="w-full border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors duration-300"
                    >
                      {tCalc('requestQuote')} →
                    </button>
                  ) : (
                    <form onSubmit={handleQuoteSubmit} className="space-y-3 border-t border-[#1A1A1A]/10 pt-4">
                      <input
                        type="text"
                        required
                        value={quoteName}
                        onChange={(e) => setQuoteName(e.target.value)}
                        placeholder={tCalc('quoteName')}
                        className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                      />
                      <input
                        type="email"
                        required
                        value={quoteEmail}
                        onChange={(e) => setQuoteEmail(e.target.value)}
                        placeholder={tCalc('quoteEmail')}
                        className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                      />
                      <input
                        type="tel"
                        value={quotePhone}
                        onChange={(e) => setQuotePhone(e.target.value)}
                        placeholder={tCalc('quotePhone')}
                        className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                      />
                      <button
                        type="submit"
                        disabled={quoteStatus === 'loading'}
                        className="w-full bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors duration-300 disabled:opacity-60"
                      >
                        {quoteStatus === 'loading' ? tCalc('quoteSending') : tCalc('quoteSubmit')}
                      </button>
                      {quoteStatus === 'success' && (
                        <p className="text-xs text-green-700">{tCalc('quoteSuccess')}</p>
                      )}
                      {quoteStatus === 'error' && (
                        <p className="text-xs text-red-600">{tCalc('quoteError')}</p>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: About Section */}
        <section id="about" className="py-24 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center bg-white">
          <div className="aspect-[4/3] bg-zinc-50 rounded-lg overflow-hidden border border-zinc-100 flex items-center justify-center">
            <img
              src={aboutImage}
              alt={t('About.title')}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8B89A]">
              {t('Stats.swiss')}
            </span>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">{t('About.title')}</h2>
            <p className="text-base text-[#1A1A1A]/70 leading-relaxed font-light">
              {t('About.text')}
            </p>
          </div>
        </section>

        {/* Section 6: Installation Gallery */}
        <section id="gallery" className="bg-zinc-50 py-24 px-6 border-t border-zinc-100">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-[#1A1A1A]">{t('Navigation.gallery')}</h2>
              <p className="text-sm text-[#1A1A1A]/50 max-w-lg mx-auto">{t('Gallery.projectsComingSoon')}</p>
              <div className="w-16 h-0.5 bg-[#C8B89A] mx-auto" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleryImages.map((img, idx) => (
                <div
                  key={`${img.src}-${idx}`}
                  className="aspect-[4/5] bg-white border border-zinc-200 rounded-md overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7: FAQ Accordion */}
        <section className="py-24 px-6 max-w-4xl mx-auto space-y-12 bg-white">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">{t('FAQ.title')}</h2>
            <div className="w-16 h-0.5 bg-[#C8B89A] mx-auto" />
          </div>

          <div className="space-y-4">
            <details className="group border-b border-[#1A1A1A]/10 pb-4 cursor-pointer">
              <summary className="flex justify-between items-center text-base font-medium py-2">
                <span>{t('FAQ.q1')}</span>
                <span className="text-[#C8B89A] transition-transform group-open:rotate-180">↓</span>
              </summary>
              <p className="mt-2 text-sm text-[#1A1A1A]/60 leading-relaxed font-light pl-2">
                {t('FAQ.a1')}
              </p>
            </details>

            <details className="group border-b border-[#1A1A1A]/10 pb-4 cursor-pointer">
              <summary className="flex justify-between items-center text-base font-medium py-2">
                <span>{t('FAQ.q2')}</span>
                <span className="text-[#C8B89A] transition-transform group-open:rotate-180">↓</span>
              </summary>
              <p className="mt-2 text-sm text-[#1A1A1A]/60 leading-relaxed font-light pl-2">
                {t('FAQ.a2')}
              </p>
            </details>

            <details className="group border-b border-[#1A1A1A]/10 pb-4 cursor-pointer">
              <summary className="flex justify-between items-center text-base font-medium py-2">
                <span>{t('FAQ.q3')}</span>
                <span className="text-[#C8B89A] transition-transform group-open:rotate-180">↓</span>
              </summary>
              <p className="mt-2 text-sm text-[#1A1A1A]/60 leading-relaxed font-light pl-2">
                {t('FAQ.a3')}
              </p>
            </details>
          </div>
        </section>

        {/* Section 8: CTA + Newsletter + Contact */}
        <section id="contact" className="bg-gradient-to-t from-zinc-50 to-white py-24 px-6 border-t border-[#1A1A1A]/5">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-[#1A1A1A]">
              {tCTA('title')}
            </h2>
            <p className="text-sm md:text-base text-[#1A1A1A]/60 font-light">
              {tCTA('subtitle')}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4 mb-16">
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={tCTA('placeholder')}
                className="flex-grow bg-white border border-[#1A1A1A]/20 rounded px-4 py-3 text-sm focus:outline-none focus:border-[#C8B89A]"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-6 py-3 rounded text-xs font-semibold uppercase tracking-wider transition-colors duration-300 disabled:opacity-60"
              >
                {newsletterStatus === 'loading' ? '…' : tCTA('button')}
              </button>
            </form>
            {newsletterStatus === 'success' && (
              <p className="text-sm text-green-700 text-center">{tCTA('success')}</p>
            )}
            {newsletterStatus === 'error' && (
              <p className="text-sm text-red-600 text-center">{tCTA('error')}</p>
            )}
          </div>

          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-light tracking-tight">{tContact('title')}</h3>
              <p className="text-sm text-[#1A1A1A]/60">{tContact('subtitle')}</p>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-4 bg-white border border-zinc-200/85 rounded-xl p-8 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={tContact('name')}
                  className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                />
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={tContact('email')}
                  className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
                />
              </div>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={tContact('phone')}
                className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
              />
              <input
                type="text"
                required
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder={tContact('subject')}
                className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A]"
              />
              <textarea
                required
                rows={4}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder={tContact('message')}
                className="w-full bg-[#F8F8F6] border border-[#1A1A1A]/10 rounded p-3 text-sm focus:outline-none focus:border-[#C8B89A] resize-y"
              />
              <button
                type="submit"
                disabled={contactStatus === 'loading'}
                className="w-full bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors duration-300 disabled:opacity-60"
              >
                {contactStatus === 'loading' ? tContact('sending') : tContact('send')}
              </button>
              {contactStatus === 'success' && (
                <p className="text-sm text-green-700 text-center">{tContact('success')}</p>
              )}
              {contactStatus === 'error' && (
                <p className="text-sm text-red-600 text-center">{tContact('error')}</p>
              )}
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white/50 text-xs py-12 px-6 border-t border-white/5">
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
