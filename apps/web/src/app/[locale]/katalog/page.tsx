'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { SiteHeader } from '@/components/SiteHeader';
import { ColorCatalogGrid } from '@/components/ColorCatalogGrid';
import { fetchColorCatalogs } from '@/lib/color-catalog';
import { ColorCatalogDTO } from '@swisswall/types';
import { Palette, ArrowRight, Loader2 } from 'lucide-react';

export default function CatalogPage() {
  const t = useTranslations('Catalog');
  const [catalogs, setCatalogs] = useState<ColorCatalogDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColorCatalogs()
      .then(setCatalogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col">
      <SiteHeader />

      <main className="flex-grow">
        <section className="bg-white border-b border-zinc-100 py-16 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-2 text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
              <Palette className="w-4 h-4" />
              {t('badge')}
            </span>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-900">{t('title')}</h1>
            <p className="text-sm text-zinc-500 font-light max-w-xl mx-auto leading-relaxed">{t('subtitle')}</p>
          </div>
        </section>

        <section className="py-16 px-6 space-y-20">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A]" />
            </div>
          ) : catalogs.length === 0 ? (
            <p className="text-center text-zinc-400 text-sm">{t('empty')}</p>
          ) : (
            catalogs.map((catalog) => (
              <div key={catalog.id} className="max-w-6xl mx-auto">
                <ColorCatalogGrid catalog={catalog} />
              </div>
            ))
          )}
        </section>

        <section className="py-12 px-6 border-t border-zinc-100 bg-white">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-sm text-zinc-500 font-light">{t('ctaHint')}</p>
            <Link
              href="/produkte"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            >
              {t('viewProducts')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#1A1A1A] text-white/50 text-xs py-8 px-6 text-center">
        &copy; {new Date().getFullYear()} Swiss Wall Panels
      </footer>
    </div>
  );
}
