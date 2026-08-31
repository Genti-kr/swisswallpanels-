'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-store';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Package,
  User,
  MapPin,
  Heart,
  LogOut,
  Loader2,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/orders', labelKey: 'nav.orders', icon: Package, exact: false },
  { href: '/dashboard/profile', labelKey: 'nav.profile', icon: User, exact: false },
  { href: '/dashboard/addresses', labelKey: 'nav.addresses', icon: MapPin, exact: false },
  { href: '/dashboard/wishlist', labelKey: 'nav.wishlist', icon: Heart, exact: false },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { user, fetchMe, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.location.href = `/${locale}`;
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `,
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4 sm:p-5 shadow-sm lg:sticky lg:top-24 flex flex-col gap-4">
              {user && (
                <div className="flex items-center justify-between lg:block pb-3 lg:pb-5 border-b border-zinc-100 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="lg:hidden p-2 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-red-500 transition-colors shrink-0"
                    title={t('logout')}
                  >
                    {loggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#C8B89A]" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              <nav
                className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {navItems.map(({ href, labelKey, icon: Icon, exact }) => {
                  const active = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 px-4 py-2 lg:px-3 lg:py-2.5 rounded-full lg:rounded-xl text-sm transition-all whitespace-nowrap shrink-0 border ${
                        active
                          ? 'bg-[#1A1A1A] text-white border-transparent font-medium shadow-sm'
                          : 'text-zinc-600 bg-white border-zinc-200/60 lg:border-transparent lg:bg-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C8B89A]' : 'text-zinc-400'}`} />
                      <span>{t(labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden lg:flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C8B89A]" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {t('logout')}
              </button>
            </div>
          </aside>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
