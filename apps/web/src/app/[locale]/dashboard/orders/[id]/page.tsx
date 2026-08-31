'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { apiFetch } from '@/lib/api';
import { OrderDetailDTO } from '@swisswall/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  formatDashboardDateTime,
  formatDashboardMoney,
} from '@/lib/dashboard-utils';

export default function UserOrderDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    apiFetch<{ order: OrderDetailDTO }>(`/api/orders/${orderId}`)
      .then((res) => setOrder(res.order))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const statusLabel = (status: string) =>
    t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400">{t('orderDetail.notFound')}</p>
        <Link href="/dashboard/orders" className="text-sm text-[#C8B89A] mt-4 inline-block">
          ← {t('orderDetail.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#C8B89A]"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('orderDetail.back')}
      </Link>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-zinc-900">{order.orderNumber}</h1>
            <p className="text-sm text-zinc-400 mt-1">{formatDashboardDateTime(order.createdAt, locale)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{formatDashboardMoney(order.totalChf, order.currency, locale)}</p>
            <p className="text-xs text-zinc-400">{statusLabel(order.status)}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-zinc-50 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-2">{t('orderDetail.shippingAddress')}</p>
            <p>
              {order.shippingAddressJson.firstName} {order.shippingAddressJson.lastName}
            </p>
            <p>
              {order.shippingAddressJson.street} {order.shippingAddressJson.houseNumber}
            </p>
            <p>
              {order.shippingAddressJson.postCode} {order.shippingAddressJson.city}
            </p>
            <p>{order.shippingAddressJson.country}</p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-4 space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('orderDetail.subtotal')}</span>
              <span>{formatDashboardMoney(order.subtotalChf, order.currency, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('orderDetail.vat')}</span>
              <span>{formatDashboardMoney(order.vatAmountChf, order.currency, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('orderDetail.shipping')}</span>
              <span>{formatDashboardMoney(order.shippingCostChf, order.currency, locale)}</span>
            </div>
            {order.discountAmountChf > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{t('orderDetail.discount')}</span>
                <span>-{formatDashboardMoney(order.discountAmountChf, order.currency, locale)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            {t('orderDetail.items')}
          </h2>
          <div className="divide-y divide-zinc-50">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-zinc-400">{item.variantName}</p>}
                  <p className="text-xs text-zinc-400">
                    {item.quantity} × {formatDashboardMoney(item.unitPriceChf, order.currency, locale)}
                  </p>
                </div>
                <span className="font-semibold">{formatDashboardMoney(item.totalChf, order.currency, locale)}</span>
              </div>
            ))}
          </div>
        </div>

        {order.statusHistory.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              {t('orderDetail.history')}
            </h2>
            <div className="space-y-2">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="flex justify-between text-xs text-zinc-500">
                  <span>
                    {statusLabel(h.status)} {h.note && `— ${h.note}`}
                  </span>
                  <span>{formatDashboardDateTime(h.createdAt, locale)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
