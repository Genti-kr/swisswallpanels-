'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { OrderDTO } from '@swisswall/types';
import {
  Package,
  ArrowRight,
  Loader2,
  ShoppingBag,
  Calendar,
  User,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ORDER_STATUS_STYLES,
  formatDashboardDate,
  formatDashboardMoney,
} from '@/lib/dashboard-utils';

export default function DashboardHomePage() {
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: OrderDTO[] }>('/api/orders')
      .then((res) => setOrders(res.items.slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayName = user?.firstName || user?.email || '';

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-gradient-to-r from-[#F8F8F6] to-[#F1F0EC] rounded-2xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
          <div
            className="w-full h-full bg-cover bg-center grayscale"
            style={{ backgroundImage: 'url(/Enhancing-Wood-Panel-Walls.webp)' }}
          />
        </div>
        <div className="relative z-10 max-w-lg space-y-1.5">
          <span className="text-[#C8B89A] text-[10px] font-bold uppercase tracking-[0.2em] block">
            {t('home.badge')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-950">
            {t('home.welcome', { name: displayName })}
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-light leading-relaxed">{t('home.subtitle')}</p>
        </div>
        <Link
          href="/produkte"
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white hover:bg-[#C8B89A] hover:text-[#1A1A1A] px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm z-10 shrink-0"
        >
          {t('home.exploreCatalog')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Link
          href="/dashboard/orders"
          className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#C8B89A]/30 transition-all duration-300 group"
        >
          <div>
            <div className="text-2xl sm:text-3xl font-light text-zinc-900 leading-none">{orders.length}</div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider mt-2.5 font-medium group-hover:text-[#C8B89A] transition-colors">
              {t('home.myOrders')}
            </div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#C8B89A]/10 border border-[#C8B89A]/20 flex items-center justify-center transition-all duration-300 group-hover:bg-[#C8B89A]/20 shrink-0">
            <ShoppingBag className="w-5 h-5 text-[#C8B89A]" />
          </div>
        </Link>

        <Link
          href="/dashboard/profile"
          className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#C8B89A]/30 transition-all duration-300 group"
        >
          <div>
            <div className="text-sm font-semibold text-zinc-900 group-hover:text-[#C8B89A] transition-colors">
              {t('home.myProfile')}
            </div>
            <div className="text-xs text-zinc-400 mt-1 font-light">{t('home.profileHint')}</div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-50 border border-transparent group-hover:bg-[#C8B89A]/15 group-hover:border-[#C8B89A]/20 flex items-center justify-center transition-all duration-300 shrink-0">
            <User className="w-5 h-5 text-zinc-400 group-hover:text-[#C8B89A] transition-colors" />
          </div>
        </Link>

        <Link
          href="/dashboard/addresses"
          className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#C8B89A]/30 transition-all duration-300 group"
        >
          <div>
            <div className="text-sm font-semibold text-zinc-900 group-hover:text-[#C8B89A] transition-colors">
              {t('home.myAddresses')}
            </div>
            <div className="text-xs text-zinc-400 mt-1 font-light">{t('home.addressesHint')}</div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-50 border border-transparent group-hover:bg-[#C8B89A]/15 group-hover:border-[#C8B89A]/20 flex items-center justify-center transition-all duration-300 shrink-0">
            <MapPin className="w-5 h-5 text-zinc-400 group-hover:text-[#C8B89A] transition-colors" />
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/40">
          <div>
            <h2 className="font-semibold text-zinc-900 text-sm sm:text-base">{t('home.recentOrders')}</h2>
            <p className="text-xs text-zinc-400 font-light mt-0.5">{t('home.recentOrdersHint')}</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs text-[#C8B89A] font-bold uppercase tracking-wider hover:text-[#1A1A1A] transition-colors flex items-center gap-0.5"
          >
            {t('home.viewAll')}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 font-light">{t('home.noOrders')}</p>
            <Link
              href="/produkte"
              className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-[#C8B89A] hover:underline"
            >
              {t('home.createFirstOrder')}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 hover:bg-[#F8F8F6]/40 transition-colors gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 font-mono">{order.orderNumber}</span>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        ORDER_STATUS_STYLES[order.status] || 'bg-zinc-50 text-zinc-600 border-zinc-100'
                      }`}
                    >
                      {t.has(`statuses.${order.status}`)
                        ? t(`statuses.${order.status}`)
                        : order.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                    {formatDashboardDate(order.createdAt, locale)}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-zinc-100/50 sm:border-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatDashboardMoney(order.totalChf, order.currency, locale)}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-light">{t('home.invoiceTotal')}</p>
                  </div>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-zinc-50 hover:bg-[#1A1A1A] hover:text-white border border-zinc-200/80 text-zinc-700 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 shadow-sm shrink-0"
                  >
                    {t('home.details')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
