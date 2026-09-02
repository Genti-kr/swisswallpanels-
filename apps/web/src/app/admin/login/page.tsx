'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { isAdminRole } from '@/lib/user-mapper';
import {
  getAuthErrorCode,
  resolveAuthErrorMessage,
} from '@/lib/auth-errors';
import type { AppLocale } from '@/i18n/routing';

const ADMIN_LOCALES: AppLocale[] = ['de', 'fr', 'en', 'sq'];

function readAdminLocale(): AppLocale {
  if (typeof document === 'undefined') return 'sq';
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  return ADMIN_LOCALES.includes(value as AppLocale) ? (value as AppLocale) : 'sq';
}

const inputClass =
  'w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1A1A] placeholder:text-zinc-400 caret-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C8B89A]/40 focus:border-[#C8B89A] transition-all [color-scheme:light]';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [locale, setLocale] = useState<AppLocale>('sq');
  const { login, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setLocale(readAdminLocale());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password, false, { locale });
      const user = useAuth.getState().user;
      if (!user || !isAdminRole(user.role)) {
        setError(resolveAuthErrorMessage('no_admin_access', 'no_admin_access', locale));
        await useAuth.getState().logout();
        return;
      }
      router.push('/admin/orders');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError(resolveAuthErrorMessage(null, 'invalid_credentials', locale));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#F8F8F6]">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <img
          src="/Enhancing-Wood-Panel-Walls.webp"
          alt=""
          className="w-full h-full object-cover grayscale"
        />
      </div>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute left-1/4 top-0 w-px h-full bg-[#1A1A1A]" />
        <div className="absolute right-1/4 top-0 w-px h-full bg-[#1A1A1A]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/de" className="inline-block">
            <div className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
              Wall<span className="font-light text-[#C8B89A]">Design</span>
            </div>
          </Link>
          <span className="block text-[#C8B89A] text-[10px] font-bold uppercase tracking-[0.2em] mt-3">
            Admin Panel
          </span>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-2">Hyrje</h1>
          <p className="text-zinc-500 text-sm font-light mt-2">
            Menaxho porositë dhe produktet
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-zinc-100/80 space-y-6"
        >
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
              Fjalëkalimi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Duke u futur...
              </>
            ) : (
              'Hyr'
            )}
          </button>
        </form>

        <p className="text-center mt-6">
          <Link
            href="/de"
            className="text-xs text-zinc-400 hover:text-[#C8B89A] transition-colors uppercase tracking-wider"
          >
            ← Kthehu në faqen kryesore
          </Link>
        </p>
      </div>
    </div>
  );
}
