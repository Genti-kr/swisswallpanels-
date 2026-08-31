'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useAuth } from '@/lib/auth-store';
import { isAdminRole } from '@/lib/user-mapper';

const mainNavItems = [
  { key: 'home', href: '/' as const, match: (path: string) => path === '/' },
  { key: 'about', href: '/#about' as const, match: () => false },
  { key: 'products', href: '/produkte' as const, match: (path: string) => path.startsWith('/produkte') },
  { key: 'catalog', href: '/katalog' as const, match: (path: string) => path.startsWith('/katalog') },
  { key: 'gallery', href: '/#gallery' as const, match: () => false },
  { key: 'contact', href: '/#contact' as const, match: () => false },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const tNav = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const { cart, fetchCart } = useCart();
  const { user, fetchMe } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchCart();
    fetchMe();
  }, [fetchCart, fetchMe]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const cartCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const navLinkClass = (active: boolean) =>
    `transition-colors whitespace-nowrap ${
      active
        ? 'text-[#C8B89A] font-bold'
        : 'text-[#1A1A1A]/80 hover:text-[#C8B89A]'
    }`;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left — logo only */}
        <div className="justify-self-start">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#1A1A1A] hover:opacity-90 transition-opacity"
          >
            Swiss<span className="font-light text-[#C8B89A]">Wall</span>
          </Link>
        </div>

        {/* Center — main navigation */}
        <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-xs font-semibold uppercase tracking-wider">
          {mainNavItems.map(({ key, href, match }) => (
            <Link key={key} href={href} className={navLinkClass(match(pathname))}>
              {tNav(key)}
            </Link>
          ))}
        </nav>

        {/* Right — cart, login, get quote */}
        <div className="justify-self-end flex items-center gap-2 sm:gap-3">
          <Link
            href="/warenkorb"
            className={`relative p-2.5 transition-colors flex items-center justify-center rounded-full border ${
              pathname.startsWith('/warenkorb')
                ? 'text-[#C8B89A] bg-[#C8B89A]/10 border-[#C8B89A]/30'
                : 'text-zinc-700 hover:text-[#C8B89A] bg-zinc-50 hover:bg-zinc-100 border-zinc-200/40'
            }`}
            aria-label={tCommon('cart')}
          >
            <ShoppingBag className="w-4.5 h-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-white text-[10px] font-bold min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full border border-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            isAdminRole(user.role) ? (
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border border-zinc-200 text-zinc-700 hover:border-[#C8B89A] hover:text-[#1A1A1A] transition-all"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[6rem] truncate">{user.firstName}</span>
              </a>
            ) : (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border border-zinc-200 text-zinc-700 hover:border-[#C8B89A] hover:text-[#1A1A1A] transition-all"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[6rem] truncate">{user.firstName}</span>
              </Link>
            )
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border border-zinc-200 text-zinc-700 hover:border-[#C8B89A] hover:text-[#1A1A1A] transition-all"
            >
              {tCommon('login')}
            </Link>
          )}

          <Link
            href="/#calculator"
            className="inline-flex items-center bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-sm whitespace-nowrap"
          >
            {tNav('getQuote')}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="lg:hidden p-2.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-[#1A1A1A] hover:border-[#C8B89A] transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="lg:hidden border-t border-zinc-100 bg-white/95 px-4 py-4 space-y-1">
          {mainNavItems.map(({ key, href, match }) => (
            <Link
              key={key}
              href={href}
              className={`block px-3 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wider ${navLinkClass(match(pathname))}`}
            >
              {tNav(key)}
            </Link>
          ))}
          {!user && (
            <Link
              href="/login"
              className="block px-3 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-zinc-700 hover:text-[#C8B89A]"
            >
              {tCommon('login')}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
