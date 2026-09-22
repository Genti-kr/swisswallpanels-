'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { OrderDetailDTO, OrderStatus } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Send,
  Trash2,
  Truck,
} from 'lucide-react';
import { OrderItemsList } from '@/components/OrderItemsList';
import { ORDER_STATUS_STYLES, formatDashboardDateTime } from '@/lib/dashboard-utils';
import { formatAdminCanton, formatAdminCountry } from '@/lib/shipping-geo';
import { adminRowLabelClass, adminRowValueClass, adminSelectClass, adminTextareaClass } from '@/lib/admin-ui';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

const statusLabels: Record<string, string> = {
  PENDING: 'Në pritje',
  PAYMENT_CONFIRMED: 'Pagesa konfirmuar',
  PROCESSING: 'Në përpunim',
  SHIPPED: 'Dërguar',
  DELIVERED: 'Dorëzuar',
  CANCELLED: 'Anuluar',
  REFUNDED: 'Rimbursuar',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Në pritje',
  PAID: 'Paguar',
  FAILED: 'Dështuar',
  REFUNDED: 'Rimbursuar',
  PARTIALLY_REFUNDED: 'Pjesërisht rimbursuar',
};

function formatCHF(value: number) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(value);
}

function canDeleteOrder(order: OrderDetailDTO) {
  const ps = order.paymentStatus ?? 'PENDING';
  return ps === 'PENDING' || ps === 'FAILED';
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: OrderDetailDTO['shippingAddressJson'];
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-[#F8F8F6] p-5 text-zinc-900">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#C8B89A]" />
        {title}
      </p>
      <div className="text-sm text-zinc-800 space-y-1 leading-relaxed">
        <p className="font-semibold text-zinc-900">
          {address.firstName} {address.lastName}
        </p>
        {address.company ? <p className="text-zinc-700">{address.company}</p> : null}
        <p>
          {address.street} {address.houseNumber}
        </p>
        <p>
          {address.postCode} {address.city}
          {address.canton && address.country === 'CH'
            ? `, ${formatAdminCanton(address.canton)}`
            : ''}
        </p>
        <p>{formatAdminCountry(address.country)}</p>
        {address.phone ? <p className="text-zinc-600 pt-2">{address.phone}</p> : null}
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetailDTO | null>(null);
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    apiFetch<{ order: OrderDetailDTO }>(`/api/admin/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setStatus(res.order.status);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: note || undefined }),
      });
      setNote('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async () => {
    if (!order || !canDeleteOrder(order)) return;
    const ok = window.confirm(
      `Fshini porosinë ${order.orderNumber}? Ky veprim nuk mund të kthehet.`
    );
    if (!ok) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await apiFetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
      router.push('/admin/orders');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setDeleteError(
        msg.includes('ORDER_PAID') || msg.includes('409')
          ? 'Porositë e paguara nuk mund të fshihen.'
          : 'Fshirja dështoi. Provoni përsëri.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/orders/${id}/note`, {
        method: 'POST',
        body: JSON.stringify({ note: reply }),
      });
      setReply('');
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-8 text-center text-zinc-900">
        <p className="text-red-600 font-medium">Porosia nuk u gjet.</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 mt-4 text-sm text-[#C8B89A] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Kthehu te porositë
        </Link>
      </div>
    );
  }

  const statusClass =
    ORDER_STATUS_STYLES[order.status] || 'bg-zinc-100 text-zinc-800 border-zinc-200';
  const ship = order.shippingAddressJson;
  const bill = order.billingAddressJson;

  return (
    <div className="space-y-8 max-w-4xl text-zinc-900">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-[#C8B89A] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kthehu te porositë
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
              Detajet e porosisë
            </span>
            <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1 font-mono">
              {order.orderNumber}
            </h1>
            <p className="text-zinc-600 text-sm font-light mt-2">
              {order.user
                ? `${order.user.firstName} ${order.user.lastName} — ${order.user.email}`
                : order.guestEmail}
            </p>
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {formatDashboardDateTime(order.createdAt, 'de')}
            </p>
          </div>
          <div className="text-left sm:text-right space-y-2">
            <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
              {formatCHF(order.totalChf)}
            </p>
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusClass}`}
            >
              {statusLabels[order.status] || order.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Pagesa</p>
          <p className="text-sm font-semibold text-zinc-900">
            {paymentStatusLabels[order.paymentStatus ?? ''] || order.paymentStatus || '—'}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Metoda: <span className="font-medium text-zinc-800">{order.paymentMethod || '—'}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#C8B89A]" />
            Dërgesa
          </p>
          <p className="text-sm font-semibold text-zinc-900">{order.shippingMethod || '—'}</p>
          {order.trackingNumber ? (
            <p className="text-xs text-zinc-600 mt-2 font-mono">{order.trackingNumber}</p>
          ) : null}
        </div>
        {order.couponCode ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Kuponi</p>
            <p className="text-sm font-mono font-semibold text-emerald-700">{order.couponCode}</p>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <AddressBlock title="Adresa e dërgesës" address={ship} />
          <AddressBlock title="Adresa e faturimit" address={bill} />
        </div>

        <div className="rounded-xl border border-zinc-100 bg-[#F8F8F6] p-5 space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className={adminRowLabelClass}>Nëntotali</span>
            <span className={adminRowValueClass}>{formatCHF(order.subtotalChf)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className={adminRowLabelClass}>TVSH</span>
            <span className={adminRowValueClass}>{formatCHF(order.vatAmountChf)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className={adminRowLabelClass}>Transporti</span>
            <span className={adminRowValueClass}>{formatCHF(order.shippingCostChf)}</span>
          </div>
          {order.discountAmountChf > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>Zbritja</span>
              <span className="font-semibold tabular-nums">-{formatCHF(order.discountAmountChf)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2.5 mt-1">
            <span className="font-semibold text-zinc-900">Totali</span>
            <span className="font-bold text-zinc-900 tabular-nums">{formatCHF(order.totalChf)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#C8B89A]" />
          Artikujt
        </h2>
        <OrderItemsList
          items={order.items}
          formatLineTotal={(item) => formatCHF(item.totalChf)}
          formatUnitPrice={(item) => formatCHF(item.unitPriceChf)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
          Ndrysho statusin
        </h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className={adminSelectClass}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s] || s}
            </option>
          ))}
        </select>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Shënim opsional për klientin..."
          className={`${adminTextareaClass} h-24`}
        />
        <button
          onClick={updateStatus}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Përditëso statusin
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
          Përgjigju klientit
        </h2>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Mesazhi për klientin..."
          className={`${adminTextareaClass} h-28`}
        />
        <button
          onClick={sendReply}
          disabled={saving || !reply.trim()}
          className="inline-flex items-center gap-2 bg-[#C8B89A] text-[#1A1A1A] px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Dërgo përgjigjen
        </button>
      </div>

      {order.statusHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 mb-5">
            Historiku
          </h2>
          <div className="space-y-3 rounded-xl border border-zinc-100 bg-[#F8F8F6] p-4">
            {order.statusHistory.map((h) => (
              <div
                key={h.id}
                className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm border-l-2 border-[#C8B89A] pl-4"
              >
                <div className="text-zinc-800">
                  <span className="font-medium text-zinc-900">
                    {statusLabels[h.status] || h.status}
                  </span>
                  {h.note ? <p className="text-zinc-600 mt-1">{h.note}</p> : null}
                </div>
                <span className="text-zinc-500 text-xs sm:text-sm shrink-0">
                  {formatDashboardDateTime(h.createdAt, 'de')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canDeleteOrder(order) ? (
        <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-700">
            Zona e rrezikshme
          </h2>
          <p className="text-sm text-zinc-600">
            Porosia nuk është paguar — mund ta fshini nga sistemi (p.sh. porosi e braktisur në pagesë).
          </p>
          {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
          <button
            type="button"
            onClick={deleteOrder}
            disabled={deleting || saving}
            className="inline-flex items-center gap-2 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Fshi porosinë
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 pl-1">
          Porositë e paguara nuk mund të fshihen — përdorni statusin «Anuluar» ose rimbursimin.
        </p>
      )}
    </div>
  );
}
