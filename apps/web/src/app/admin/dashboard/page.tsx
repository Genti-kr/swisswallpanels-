'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { DashboardStatsDTO } from '@swisswall/types';
import { Loader2, TrendingUp, Package, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatAdminCountry } from '@/lib/shipping-geo';
import { adminRowLabelClass, adminRowValueClass } from '@/lib/admin-ui';

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
        <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-zinc-700 bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
        Nuk mund të ngarkohen statistikat.
      </p>
    );
  }

  const countryEntries = Object.entries(stats.revenueByCountry ?? {});

  const kpis = [
    { label: 'Të ardhurat sot', value: formatCHF(stats.todayRevenue), icon: TrendingUp },
    { label: 'Të ardhurat mujore', value: formatCHF(stats.monthRevenue), icon: TrendingUp },
    { label: 'Porosi të reja', value: stats.newOrders, icon: Package },
    { label: 'Klientë të rinj', value: stats.newCustomers, icon: Users },
    { label: 'Pagesa në pritje', value: stats.pendingPayments, icon: AlertTriangle },
    { label: 'Stok i ulët', value: stats.lowStockProducts, icon: Package },
  ];

  return (
    <div className="space-y-8 text-zinc-900">
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">Admin Panel</span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Dashboard</h1>
        <p className="text-zinc-600 text-sm font-light mt-1">Përmbledhje e aktivitetit të dyqanit</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[#C8B89A]/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C8B89A]" />
            </div>
            <div>
              <div className="text-xl font-light text-zinc-900">{value}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 mb-4">
            Të ardhurat sipas vendit
          </h2>
          {countryEntries.length === 0 ? (
            <p className="text-sm text-zinc-500">Ende pa të dhëna.</p>
          ) : (
            <div className="space-y-2.5">
              {countryEntries.map(([country, revenue]) => (
                <div key={country} className="flex justify-between gap-4 text-sm">
                  <span className={adminRowLabelClass}>
                    {formatAdminCountry(country)}
                  </span>
                  <span className={adminRowValueClass}>{formatCHF(revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 mb-4">Top produktet</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-zinc-500">Ende pa të dhëna.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topProducts.map((p) => (
                <div key={p.name} className="flex justify-between gap-4 text-sm">
                  <span className={`truncate pr-4 ${adminRowLabelClass}`}>{p.name}</span>
                  <span className={adminRowValueClass}>{formatCHF(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center gap-4">
          <h2 className="font-semibold text-zinc-900">Porositë e fundit</h2>
          <Link href="/admin/orders" className="text-xs text-[#C8B89A] font-semibold hover:underline">
            Shiko të gjitha →
          </Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">Nuk ka porosi ende.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex justify-between gap-4 px-6 py-3.5 hover:bg-[#F8F8F6] text-sm transition-colors"
              >
                <span className="font-medium text-zinc-900 font-mono">{order.orderNumber}</span>
                <span className={adminRowValueClass}>{formatCHF(order.totalChf)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
