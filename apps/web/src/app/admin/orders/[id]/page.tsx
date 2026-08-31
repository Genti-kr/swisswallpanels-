'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OrderDetailDTO, OrderStatus } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Loader2, Send, RefreshCw } from 'lucide-react';

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

function formatCHF(value: number) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(value);
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetailDTO | null>(null);
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
        <p className="text-red-600">Porosia nuk u gjet.</p>
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-[#C8B89A] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kthehu te porositë
        </Link>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          Detajet e porosisë
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1 font-mono">
          {order.orderNumber}
        </h1>
        <p className="text-zinc-500 text-sm font-light mt-2">
          {order.user
            ? `${order.user.firstName} ${order.user.lastName} — ${order.user.email}`
            : order.guestEmail}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">Artikujt</h2>
        <div className="divide-y divide-zinc-50">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-3 first:pt-0 last:pb-0">
              <span className="text-zinc-700">
                {item.productName}
                {item.variantName && ` (${item.variantName})`} × {item.quantity}
              </span>
              <span className="font-medium text-zinc-900">{formatCHF(item.totalChf)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-semibold pt-4 border-t border-zinc-100 text-zinc-900">
          <span>Totali</span>
          <span>{formatCHF(order.totalChf)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
          Ndrysho statusin
        </h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className="border border-zinc-200 rounded-xl px-4 py-3 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#C8B89A]/40 focus:border-[#C8B89A]"
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
          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-[#C8B89A]/40 focus:border-[#C8B89A] resize-none"
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
          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm h-28 focus:outline-none focus:ring-2 focus:ring-[#C8B89A]/40 focus:border-[#C8B89A] resize-none"
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
          <div className="space-y-4">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="text-sm border-l-2 border-[#C8B89A] pl-4">
                <div className="font-medium text-zinc-900">
                  {statusLabels[h.status] || h.status}
                </div>
                {h.note && <p className="text-zinc-600 mt-1">{h.note}</p>}
                <div className="text-xs text-zinc-400 mt-1">
                  {new Date(h.createdAt).toLocaleString('de-CH')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
