'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { DashboardStatsDTO } from '@swisswall/types';
import { Loader2, TrendingUp, Package, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function formatCHF(value: number) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(value);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardStatsDTO>('/api/admin/dashboard/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-zinc-400">Nuk mund të ngarkohen statistikat.</p>;
  }

  const kpis = [
    { label: 'Të ardhurat sot', value: formatCHF(stats.todayRevenue), icon: TrendingUp },
    { label: 'Të ardhurat mujore', value: formatCHF(stats.monthRevenue), icon: TrendingUp },
    { label: 'Porosi të reja', value: stats.newOrders, icon: Package },
    { label: 'Klientë të rinj', value: stats.newCustomers, icon: Users },
    { label: 'Pagesa në pritje', value: stats.pendingPayments, icon: AlertTriangle },
    { label: 'Stok i ulët', value: stats.lowStockProducts, icon: Package },
  ];

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">Admin Panel</span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Dashboard</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">Përmbledhje e aktivitetit të dyqanit</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[#C8B89A]/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C8B89A]" />
            </div>
            <div>
              <div className="text-xl font-light text-zinc-900">{value}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Të ardhurat sipas vendit</h2>
          <div className="space-y-2">
            {Object.entries(stats.revenueByCountry).map(([country, revenue]) => (
              <div key={country} className="flex justify-between text-sm">
                <span>{country}</span>
                <span className="font-semibold">{formatCHF(revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Top produktet</h2>
          <div className="space-y-2">
            {stats.topProducts.map((p) => (
              <div key={p.name} className="flex justify-between text-sm">
                <span className="truncate pr-4">{p.name}</span>
                <span className="font-semibold shrink-0">{formatCHF(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between">
          <h2 className="font-medium">Porositë e fundit</h2>
          <Link href="/admin/orders" className="text-xs text-[#C8B89A] font-semibold">Shiko të gjitha →</Link>
        </div>
        <div className="divide-y divide-zinc-50">
          {stats.recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex justify-between px-6 py-3 hover:bg-zinc-50 text-sm"
            >
              <span className="font-medium">{order.orderNumber}</span>
              <span>{formatCHF(order.totalChf)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
