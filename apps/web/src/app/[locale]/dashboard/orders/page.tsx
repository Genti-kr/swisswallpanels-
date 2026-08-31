'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { apiFetch } from '@/lib/api';
import { OrderDTO } from '@swisswall/types';
import { Loader2, Eye, Calendar, ClipboardList } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ORDER_STATUS_STYLES,
  formatDashboardDate,
  formatDashboardMoney,
} from '@/lib/dashboard-utils';

export default function UserOrdersPage() {
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: OrderDTO[] }>('/api/orders')
      .then((res) => setOrders(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          {t('accountLabel')}
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">{t('orders.title')}</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">{t('orders.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm">
          <ClipboardList className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-light">{t('orders.noOrders')}</p>
          <Link
            href="/produkte"
            className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-[#C8B89A] hover:underline"
          >
            {t('orders.viewProducts')}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
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
                    <p className="text-[10px] text-zinc-400 font-light">{t('orders.invoiceTotal')}</p>
                  </div>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-zinc-50 hover:bg-[#1A1A1A] hover:text-white border border-zinc-200/80 text-zinc-700 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 shadow-sm shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('orders.details')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
