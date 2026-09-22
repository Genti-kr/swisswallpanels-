'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { apiFetch } from '@/lib/api';
import { OrderDetailDTO } from '@swisswall/types';
import { ArrowLeft, Calendar, Loader2, MapPin, Package } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ORDER_STATUS_STYLES,
  formatDashboardDateTime,
  formatDashboardMoney,
} from '@/lib/dashboard-utils';
import { isShippingCountryCode } from '@/lib/shipping-geo';
import { OrderItemsList } from '@/components/OrderItemsList';

export default function UserOrderDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const tGeo = useTranslations('Geo');
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
        <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm">
        <p className="text-zinc-600">{t('orderDetail.notFound')}</p>
        <Link
          href="/dashboard/orders"
          className="text-sm font-semibold text-[#C8B89A] hover:underline mt-4 inline-block"
        >
          ← {t('orderDetail.back')}
        </Link>
      </div>
    );
  }

  const statusClass =
    ORDER_STATUS_STYLES[order.status] || 'bg-zinc-100 text-zinc-800 border-zinc-200';

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-[#C8B89A] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('orderDetail.back')}
      </Link>

      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          {t('accountLabel')}
        </span>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-1">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-900 font-mono">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-zinc-500 font-light mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {formatDashboardDateTime(order.createdAt, locale)}
            </p>
          </div>
          <div className="text-left sm:text-right space-y-2">
            <p className="text-2xl font-semibold text-zinc-900">
              {formatDashboardMoney(order.totalChf, order.currency, locale)}
            </p>
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusClass}`}
            >
              {statusLabel(order.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 shadow-sm space-y-8 text-zinc-800">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-100 bg-[#F8F8F6] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C8B89A]" />
              {t('orderDetail.shippingAddress')}
            </p>
            <div className="text-sm text-zinc-800 space-y-1 leading-relaxed">
              <p className="font-semibold text-zinc-900">
                {order.shippingAddressJson.firstName} {order.shippingAddressJson.lastName}
              </p>
              <p>
                {order.shippingAddressJson.street} {order.shippingAddressJson.houseNumber}
              </p>
              <p>
                {order.shippingAddressJson.postCode} {order.shippingAddressJson.city}
                {order.shippingAddressJson.canton && order.shippingAddressJson.country === 'CH'
                  ? `, ${tGeo(`cantons.${order.shippingAddressJson.canton}`)}`
                  : ''}
              </p>
              <p>
                {isShippingCountryCode(order.shippingAddressJson.country)
                  ? tGeo(`countries.${order.shippingAddressJson.country}`)
                  : order.shippingAddressJson.country}
              </p>
              {order.shippingAddressJson.phone ? (
                <p className="text-zinc-600 pt-1">{order.shippingAddressJson.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-[#F8F8F6] p-5 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-600">{t('orderDetail.subtotal')}</span>
              <span className="font-medium text-zinc-900 tabular-nums">
                {formatDashboardMoney(order.subtotalChf, order.currency, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-600">{t('orderDetail.vat')}</span>
              <span className="font-medium text-zinc-900 tabular-nums">
                {formatDashboardMoney(order.vatAmountChf, order.currency, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-600">{t('orderDetail.shipping')}</span>
              <span className="font-medium text-zinc-900 tabular-nums">
                {formatDashboardMoney(order.shippingCostChf, order.currency, locale)}
              </span>
            </div>
            {order.discountAmountChf > 0 && (
              <div className="flex justify-between gap-4 text-emerald-700">
                <span>{t('orderDetail.discount')}</span>
                <span className="font-medium tabular-nums">
                  -{formatDashboardMoney(order.discountAmountChf, order.currency, locale)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2.5 mt-1">
              <span className="font-semibold text-zinc-900">{t('home.invoiceTotal')}</span>
              <span className="font-bold text-zinc-900 tabular-nums">
                {formatDashboardMoney(order.totalChf, order.currency, locale)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#C8B89A]" />
            {t('orderDetail.items')}
          </h2>
          <OrderItemsList
            items={order.items}
            formatLineTotal={(item) =>
              formatDashboardMoney(item.totalChf, order.currency, locale)
            }
            formatUnitPrice={(item) =>
              formatDashboardMoney(item.unitPriceChf, order.currency, locale)
            }
          />
        </div>

        {order.statusHistory.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
              {t('orderDetail.history')}
            </h2>
            <div className="space-y-2 rounded-xl border border-zinc-100 bg-[#F8F8F6] p-4">
              {order.statusHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm text-zinc-700"
                >
                  <span className="text-zinc-800">
                    <span className="font-medium text-zinc-900">{statusLabel(h.status)}</span>
                    {h.note ? ` — ${h.note}` : ''}
                  </span>
                  <span className="text-zinc-500 text-xs sm:text-sm shrink-0">
                    {formatDashboardDateTime(h.createdAt, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
