'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { ProductDTO } from '@swisswall/types';
import { resolveMediaUrl } from '@/lib/media-url';
import { Heart, Loader2, Trash2, Package } from 'lucide-react';
import { formatDashboardMoney } from '@/lib/dashboard-utils';

type WishlistItem = {
  id: string;
  productId: string;
  product: ProductDTO;
  addedAt: string;
};

export default function WishlistPage() {
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch<{ items: WishlistItem[] }>('/api/wishlist')
      .then((res) => setItems(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (productId: string) => {
    await apiFetch(`/api/wishlist/${productId}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          {t('accountLabel')}
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">{t('wishlist.title')}</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">{t('wishlist.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm">
          <Heart className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-500 font-light">{t('wishlist.empty')}</p>
          <Link
            href="/produkte"
            className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-[#C8B89A] hover:underline"
          >
            {t('wishlist.viewProducts')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {items.map((item) => {
            const name =
              item.product.nameJson[locale as keyof typeof item.product.nameJson] ||
              item.product.nameJson.de;
            const img = item.product.images[0];
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-zinc-100 p-4 flex gap-4 shadow-sm hover:border-[#C8B89A]/30 transition-all duration-300 hover:shadow-md"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F8F8F6] shrink-0 border border-zinc-100 flex items-center justify-center">
                  {img ? (
                    <img
                      src={resolveMediaUrl(img.url)}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-zinc-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <Link
                      href={`/produkte/${item.product.slug}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-[#C8B89A] transition-colors line-clamp-1"
                    >
                      {name}
                    </Link>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.product.sku}</p>
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 mt-1">
                    {formatDashboardMoney(item.product.priceChf, 'CHF', locale)}
                    <span className="text-xs text-zinc-400 font-normal"> /m²</span>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-end shrink-0">
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title={t('wishlist.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
