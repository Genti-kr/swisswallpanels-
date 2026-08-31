'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderDetailDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { ClipboardList, Loader2, Package, Eye } from 'lucide-react';

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  PAYMENT_CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-100',
  SHIPPED: 'bg-violet-50 text-violet-700 border-violet-100',
  DELIVERED: 'bg-green-50 text-green-700 border-green-100',
  CANCELLED: 'bg-red-50 text-red-700 border-red-100',
  REFUNDED: 'bg-zinc-50 text-zinc-600 border-zinc-100',
};

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDetailDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: OrderDetailDTO[] }>('/api/admin/orders')
      .then((res) => setOrders(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const processingCount = orders.filter((o) =>
    ['PAYMENT_CONFIRMED', 'PROCESSING'].includes(o.status)
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          Admin Panel
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Porositë</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">
          Shiko dhe menaxho të gjitha porositë e klientëve
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Gjithsej', value: orders.length, icon: ClipboardList },
          { label: 'Në pritje', value: pendingCount, icon: Package },
          { label: 'Aktive', value: processingCount, icon: ClipboardList },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="w-11 h-11 rounded-xl bg-[#C8B89A]/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C8B89A]" />
            </div>
            <div>
              <div className="text-2xl font-light text-zinc-900">{value}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm">
          <ClipboardList className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 font-light">Nuk ka porosi ende.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50/80 text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Nr. Porosisë</th>
                  <th className="px-6 py-4 font-semibold">Klienti</th>
                  <th className="px-6 py-4 font-semibold">Totali</th>
                  <th className="px-6 py-4 font-semibold">Statusi</th>
                  <th className="px-6 py-4 font-semibold">Data</th>
                  <th className="px-6 py-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-zinc-50 hover:bg-[#F8F8F6]/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-zinc-700">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">
                        {order.user
                          ? `${order.user.firstName} ${order.user.lastName}`
                          : order.guestEmail || '—'}
                      </div>
                      {order.user?.email && (
                        <div className="text-xs text-zinc-400 mt-0.5">{order.user.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {formatCHF(order.totalChf)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          statusStyles[order.status] || 'bg-zinc-50 text-zinc-600 border-zinc-100'
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString('de-CH')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#C8B89A] hover:text-[#1A1A1A] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Shiko
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
