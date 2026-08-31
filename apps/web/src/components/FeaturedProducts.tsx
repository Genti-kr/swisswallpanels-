'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { ProductDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { useCart } from '@/lib/cart-store';

export default function FeaturedProducts() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const locale = useLocale();
  const t = useTranslations('Products');

  useEffect(() => {
    setLoading(true);
    apiFetch<{ items: ProductDTO[] }>('/api/products?featured=true&pageSize=3')
      .then((res) => {
        setProducts(res.items);
      })
      .catch(() => {
        // Handle API failure by falling back to empty to trigger static fallbacks
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Standard premium fallbacks to display if API is unreachable
  const fallbackProducts = [
    {
      id: 'fallback-1',
      name: { de: 'Eiche Akustik Pro', en: 'Oak Acoustic Pro', fr: 'Chêne Acoustique Pro', sq: 'Lisi Akustik Pro' },
      priceChf: 89.00,
      imageUrl: '/Enhancing-Wood-Panel-Walls.webp',
      slug: 'eiche-akustik-pro'
    },
    {
      id: 'fallback-2',
      name: { de: 'Nussbaum Dekor', en: 'Walnut Decor', fr: 'Noyer Décor', sq: 'Arra Dekor' },
      priceChf: 72.00,
      imageUrl: '/balsa_02.webp',
      slug: 'nussbaum-dekor'
    },
    {
      id: 'fallback-3',
      name: { de: 'Kiefer Natur', en: 'Natural Pine', fr: 'Pin Naturel', sq: 'Pishë Natyrale' },
      priceChf: 58.00,
      imageUrl: '/images.jpg',
      slug: 'kiefer-natur'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="border border-zinc-100 rounded-lg p-6 animate-pulse space-y-4">
            <div className="aspect-[4/3] w-full bg-zinc-100 rounded-md" />
            <div className="h-4 bg-zinc-100 rounded w-2/3" />
            <div className="h-4 bg-zinc-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const itemsToRender = products.length > 0 ? products.map(p => ({
    id: p.id,
    name: p.nameJson[locale as keyof typeof p.nameJson] || p.nameJson.de,
    priceChf: p.priceChf,
    imageUrl: resolveMediaUrl(p.images[0]?.url) || '',
    slug: p.slug,
    isFallback: false
  })) : fallbackProducts.map(p => ({
    id: p.id,
    name: p.name[locale as keyof typeof p.name] || p.name.de,
    priceChf: p.priceChf,
    imageUrl: p.imageUrl,
    slug: p.slug,
    isFallback: true
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {itemsToRender.map((p) => (
        <div
          key={p.id}
          className="group relative bg-white border border-zinc-100 rounded-lg p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
        >
          <div className="aspect-[4/3] w-full bg-zinc-50 rounded-md mb-6 overflow-hidden border border-zinc-100">
            {p.imageUrl && (
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            )}
          </div>
          <h3 className="text-lg font-medium">{p.name}</h3>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#1A1A1A]/50 block">{t('pricePerM2')}</span>
              <span className="text-sm font-semibold">CHF {p.priceChf.toFixed(2)}</span>
            </div>
            {p.isFallback ? (
              <Link
                href="/produkte"
                className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                {t('details')}
              </Link>
            ) : (
              <button
                onClick={() => addItem(p.id)}
                className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                {t('addToCart')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
