'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { UserDTO } from '@swisswall/types';
import {
  Loader2,
  Search,
  Users,
  Lock,
  Unlock,
  Shield,
  Calendar,
  ShoppingBag,
  Building,
} from 'lucide-react';

const roleStyles: Record<string, string> = {
  SUPERADMIN: 'bg-zinc-900 text-[#C8B89A] border-zinc-800',
  ADMIN: 'bg-[#C8B89A]/15 text-[#1A1A1A] border-[#C8B89A]/30',
  USER: 'bg-zinc-50 text-zinc-600 border-zinc-200/60',
};

const roleLabels: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'Klient',
};

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.charAt(0) ?? '';
  const last = lastName?.charAt(0) ?? '';
  return (first + last).toUpperCase() || 'U';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<(UserDTO & { orderCount?: number; isLocked?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    apiFetch<{ items: typeof users }>(`/api/admin/users${q}`)
      .then((res) => setUsers(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleLocked = async (id: string, isLocked: boolean) => {
    await apiFetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isLocked: !isLocked }),
    });
    load();
  };

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length;
  const blockedUsers = users.filter((u) => u.isLocked).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          Admin Panel
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Përdoruesit</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">
          Menaxho klientët, administratorët dhe statusin e tyre në platformë
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Gjithsej Përdorues', value: totalUsers, icon: Users },
          { label: 'Administratorë', value: adminUsers, icon: Shield },
          { label: 'Të Bllokuar', value: blockedUsers, icon: Lock },
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

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex gap-3 flex-1 max-w-md w-full"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko email, emër ose kompani..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] text-zinc-800 shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md shrink-0"
          >
            Kërko
          </button>
        </form>
      </div>

      {/* Table / Loader */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm">
          <Users className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 font-light">Nuk u gjet asnjë përdorues.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50/80 text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Emri & Kompania</th>
                  <th className="px-6 py-4 font-semibold">Email & Telefon</th>
                  <th className="px-6 py-4 font-semibold">Roli</th>
                  <th className="px-6 py-4 font-semibold">Regjistruar më</th>
                  <th className="px-6 py-4 font-semibold">Porosi</th>
                  <th className="px-6 py-4 font-semibold">Statusi</th>
                  <th className="px-6 py-4 font-semibold text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-zinc-50 hover:bg-[#F8F8F6]/60 transition-colors"
                  >
                    {/* Emri & Kompania */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#C8B89A]/10 border border-[#C8B89A]/20 flex items-center justify-center text-[#1A1A1A] text-xs font-semibold shrink-0">
                          {getInitials(user.firstName, user.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 leading-none">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.companyName && (
                            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3 shrink-0" />
                              {user.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email & Telefon */}
                    <td className="px-6 py-4">
                      <div className="text-zinc-700 font-medium">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-zinc-400 mt-0.5">{user.phone}</div>
                      )}
                    </td>

                    {/* Roli */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          roleStyles[user.role] || roleStyles.USER
                        }`}
                      >
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>

                    {/* Regjistruar më */}
                    <td className="px-6 py-4 text-zinc-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {new Date(user.createdAt).toLocaleDateString('de-CH')}
                      </div>
                    </td>

                    {/* Porosi */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-700">
                        <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold">{user.orderCount ?? 0}</span>
                      </div>
                    </td>

                    {/* Statusi */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          user.isLocked
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}
                      >
                        {user.isLocked ? 'Bllokuar' : 'Aktiv'}
                      </span>
                    </td>

                    {/* Veprime */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleLocked(user.id, !!user.isLocked)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                          user.isLocked
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-red-500 hover:text-red-600'
                        }`}
                      >
                        {user.isLocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            Zhblloko
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Blloko
                          </>
                        )}
                      </button>
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

