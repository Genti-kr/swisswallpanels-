'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import {
  Loader2,
  Download,
  Search,
  Globe,
  CreditCard,
  Coins,
  TrendingUp,
  ShoppingCart,
  Percent,
  Truck,
  Tag,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

type OrderItem = {
  id: string;
  orderNumber: string;
  totalChf: number;
  country: string;
  paymentMethod: string;
  createdAt: string;
};

type FinanceSummary = {
  period: { from: string; to: string };
  orderCount: number;
  grossRevenue: number;
  netRevenue: number;
  vatTotal: number;
  shippingTotal: number;
  discountTotal: number;
  refundTotal: number;
  byCountry: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  orders: OrderItem[];
};

function formatCHF(value: number) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(value);
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPresetDates(preset: string) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  let from = '';
  let to = formatLocalDate(today);

  if (preset === 'this-month') {
    from = formatLocalDate(new Date(y, m, 1));
  } else if (preset === 'last-month') {
    from = formatLocalDate(new Date(y, m - 1, 1));
    to = formatLocalDate(new Date(y, m, 0));
  } else if (preset === 'this-year') {
    from = formatLocalDate(new Date(y, 0, 1));
  } else if (preset === 'all-time') {
    from = '2024-01-01';
  }
  return { from, to };
}

export default function AdminFinancePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [rangePreset, setRangePreset] = useState('this-month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [country, setCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize dates
  useEffect(() => {
    const dates = getPresetDates('this-month');
    setFrom(dates.from);
    setTo(dates.to);
  }, []);

  // Fetch data
  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;
    if (!from || !to) return;

    setLoading(true);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    if (country) params.set('country', country);

    apiFetch<FinanceSummary>(`/api/admin/finance/summary?${params.toString()}`)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, from, to, country]);

  const handlePresetChange = (preset: string) => {
    setRangePreset(preset);
    if (preset !== 'custom') {
      const dates = getPresetDates(preset);
      setFrom(dates.from);
      setTo(dates.to);
    }
  };

  const getExportUrl = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (country) params.set('country', country);
    return `/api/backend/admin/finance/export?${params.toString()}`;
  };

  const formatDateAlbanian = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (user && user.role !== 'SUPERADMIN') {
    return (
      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center text-red-600 text-sm max-w-lg mx-auto mt-12">
        Vetëm SUPERADMIN ka akses në financat e sistemit.
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A]" />
        <p className="text-sm text-zinc-400">Duke ngarkuar të dhënat financiare...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-center text-zinc-400 text-sm max-w-lg mx-auto mt-12">
        Nuk u ngarkuan të dhënat financiare. Ju lutem provoni përsëri më vonë.
      </div>
    );
  }

  // Calculate percentages and metrics
  const countryTotal = Object.values(summary.byCountry).reduce((sum, v) => sum + v, 0) || 1;
  const paymentTotal = Object.values(summary.byPaymentMethod).reduce((sum, v) => sum + v, 0) || 1;

  // Filter transactions locally
  const filteredOrders = summary.orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(term) ||
      order.country.toLowerCase().includes(term) ||
      order.paymentMethod.toLowerCase().includes(term)
    );
  });

  const kpis = [
    {
      label: 'Të ardhura Neto',
      value: formatCHF(summary.netRevenue),
      icon: TrendingUp,
      color: 'text-[#1A1A1A] bg-[#C8B89A]/15 border-[#C8B89A]/30',
      highlight: true,
      description: 'Fitimi neto (Bruto minus Rimbursimet)'
    },
    {
      label: 'Të ardhura Bruto',
      value: formatCHF(summary.grossRevenue),
      icon: Coins,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      description: 'Vlera e përgjithshme e porosive'
    },
    {
      label: 'Porosi',
      value: summary.orderCount,
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      description: 'Transaksione të paguara'
    },
    {
      label: 'TVSH (Tax)',
      value: formatCHF(summary.vatTotal),
      icon: Percent,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      description: 'Shuma e taksave të arkëtuara'
    },
    {
      label: 'Transporti',
      value: formatCHF(summary.shippingTotal),
      icon: Truck,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      description: 'Të ardhura nga transporti'
    },
    {
      label: 'Zbritje',
      value: `-${formatCHF(summary.discountTotal)}`,
      icon: Tag,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      description: 'Vlera e kuponave të përdorur'
    },
    {
      label: 'Rimbursime',
      value: `-${formatCHF(summary.refundTotal)}`,
      icon: RotateCcw,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'Kthime parash te klientët'
    }
  ];

  return (
    <div className="space-y-8 relative">
      {/* Loading Overlay for background updates */}
      {loading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A]" />
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">Admin Panel</span>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Financat</h1>
          <p className="text-sm text-zinc-500 font-light mt-1">
            Përmbledhja financiare për periudhën{' '}
            <span className="font-semibold text-zinc-700">{formatDateAlbanian(from)}</span> deri më{' '}
            <span className="font-semibold text-zinc-700">{formatDateAlbanian(to)}</span>
          </p>
        </div>
        <a
          href={getExportUrl()}
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#C8B89A] hover:text-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Eksporto CSV
        </a>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'this-month', label: 'Këtë muaj' },
            { value: 'last-month', label: 'Muajin e kaluar' },
            { value: 'this-year', label: 'Këtë vit' },
            { value: 'all-time', label: 'Të gjitha' },
            { value: 'custom', label: 'Personalizuar' },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetChange(preset.value)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                rangePreset === preset.value
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[9px] text-zinc-400 font-bold uppercase pointer-events-none">Nga</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="pl-10 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-[#C8B89A] transition-colors"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[9px] text-zinc-400 font-bold uppercase pointer-events-none">Deri</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="pl-10 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-[#C8B89A] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="relative min-w-[150px]">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 appearance-none focus:outline-none focus:border-[#C8B89A] cursor-pointer"
            >
              <option value="">Të gjitha shtetet</option>
              <option value="CH">Zvicër (CH)</option>
              <option value="DE">Gjermani (DE)</option>
              <option value="FR">Francë (FR)</option>
              <option value="IT">Itali (IT)</option>
            </select>
            <Globe className="absolute right-3 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPI stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${
                kpi.highlight ? 'border-[#C8B89A] ring-1 ring-[#C8B89A]/10 lg:col-span-2' : 'border-zinc-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">{kpi.label}</span>
                  <h3 className={`text-2xl font-light tracking-tight mt-1 text-zinc-950`}>
                    {kpi.value}
                  </h3>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.color.split(' ')[1]} ${kpi.color.split(' ')[0]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-zinc-400 mt-4 border-t border-zinc-50 pt-2 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-zinc-300"></span>
                {kpi.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdowns visual */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sipas shtetit */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-3">
              <Globe className="w-4 h-4 text-[#C8B89A]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">Të ardhurat sipas shtetit</h2>
            </div>
            <div className="space-y-5">
              {Object.entries(summary.byCountry)
                .sort((a, b) => b[1] - a[1])
                .map(([code, value]) => {
                  const pct = (value / countryTotal) * 100;
                  return (
                    <div key={code} className="space-y-1.5 group">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-zinc-700 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600">{code}</span>
                          {code === 'CH' ? 'Zvicër' : code === 'DE' ? 'Gjermani' : code === 'FR' ? 'Francë' : code === 'IT' ? 'Itali' : code}
                        </span>
                        <span className="font-semibold text-zinc-900">{formatCHF(value)}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-[#C8B89A] group-hover:bg-[#1A1A1A] transition-all duration-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-end">
                        <span className="text-[10px] text-zinc-400 font-medium">{pct.toFixed(1)}% e totalit</span>
                      </div>
                    </div>
                  );
                })}
              {Object.keys(summary.byCountry).length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">Nuk ka të dhëna për shtetet në këtë periudhë.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sipas pageses */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-3">
              <CreditCard className="w-4 h-4 text-[#C8B89A]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">Të ardhurat sipas mënyrës së pagesës</h2>
            </div>
            <div className="space-y-5">
              {Object.entries(summary.byPaymentMethod)
                .sort((a, b) => b[1] - a[1])
                .map(([method, value]) => {
                  const pct = (value / paymentTotal) * 100;
                  return (
                    <div key={method} className="space-y-1.5 group">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-zinc-700 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600 uppercase">{method}</span>
                          {method === 'STRIPE' ? 'Stripe' : method === 'PAYPAL' ? 'PayPal' : method === 'BANK' ? 'Transfer Bankar' : method === 'CASH' ? 'Para në dorë' : method}
                        </span>
                        <span className="font-semibold text-zinc-900">{formatCHF(value)}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-[#1A1A1A] group-hover:bg-[#C8B89A] transition-all duration-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-end">
                        <span className="text-[10px] text-zinc-400 font-medium">{pct.toFixed(1)}% e totalit</span>
                      </div>
                    </div>
                  );
                })}
              {Object.keys(summary.byPaymentMethod).length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">Nuk ka të dhëna për mënyrat e pagesës në këtë periudhë.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-medium text-zinc-900">Transaksionet e Periudhës</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Lista e detajuar e porosive të paguara për filtrat e përzgjedhur</p>
          </div>
          <div className="relative mt-3 sm:mt-0 max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Kërko nr. porosi ose shtet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-[#C8B89A] transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-zinc-600">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-100 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-3.5">Nr. Porosisë</th>
                <th className="px-6 py-3.5">Data & Ora</th>
                <th className="px-6 py-3.5">Shteti</th>
                <th className="px-6 py-3.5">Mënyra e Pagesës</th>
                <th className="px-6 py-3.5 text-right">Vlera</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-zinc-900 hover:text-[#C8B89A] transition-colors decoration-[#C8B89A]/40"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString('sq-AL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                      {order.country}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600 uppercase">
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-zinc-950">
                    {formatCHF(order.totalChf)}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                    Nuk u gjet asnjë transaksion për këtë kërkim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
