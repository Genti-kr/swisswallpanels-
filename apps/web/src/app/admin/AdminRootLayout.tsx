'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import {
  LogOut,
  Loader2,
  ClipboardList,
  Package,
  LayoutDashboard,
  Images,
  Users,
  Wallet,
  Palette,
  Menu,
} from 'lucide-react';
import { AuthProvider } from '@/components/AuthProvider';
import { useAuth } from '@/lib/auth-store';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: '/admin/dashboard', superAdminOnly: false },
  { href: '/admin/orders', label: 'Porositë', icon: ClipboardList, match: '/admin/orders', superAdminOnly: false },
  { href: '/admin/products', label: 'Produkte', icon: Package, match: '/admin/products', superAdminOnly: false },
  { href: '/admin/catalog', label: 'Katalogu', icon: Palette, match: '/admin/catalog', superAdminOnly: false },
  { href: '/admin/users', label: 'Përdoruesit', icon: Users, match: '/admin/users', superAdminOnly: false },
  { href: '/admin/finance', label: 'Financat', icon: Wallet, match: '/admin/finance', superAdminOnly: true },
  { href: '/admin/content', label: 'Përmbajtja', icon: Images, match: '/admin/content', superAdminOnly: false },
] as const;

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/admin/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/admin/products')) return 'Produkte';
  if (pathname.startsWith('/admin/catalog')) return 'Katalogu i Ngjyrave';
  if (pathname.startsWith('/admin/orders')) return 'Porositë';
  if (pathname.startsWith('/admin/users')) return 'Përdoruesit';
  if (pathname.startsWith('/admin/finance')) return 'Financat';
  if (pathname.startsWith('/admin/content')) return 'Përmbajtja e faqes';
  return 'Admin Panel';
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.charAt(0) ?? '';
  const last = lastName?.charAt(0) ?? '';
  return (first + last).toUpperCase() || 'A';
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, fetchMe, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/admin/login');
    }
  }, [user, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.location.href = '/de';
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const pageTitle = getPageTitle(pathname);

  const navLinkClass = (active: boolean) =>
    `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
      active
        ? 'bg-white/10 text-white shadow-sm border-l-2 border-[#C8B89A] pl-[14px]'
        : 'text-white/65 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
    }`;

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex font-sans">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Mbyll menunë"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[270px] shrink-0 bg-[#1A1A1A] text-white flex flex-col overflow-hidden transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <div
            className="w-full h-full bg-cover bg-center grayscale"
            style={{ backgroundImage: 'url(/Enhancing-Wood-Panel-Walls.webp)' }}
          />
        </div>

        <div className="relative z-10 p-6 flex flex-col h-full">
          <Link href="/admin/dashboard" className="mb-10 block group">
            <div className="text-xl font-bold tracking-tight">
              Swiss<span className="font-light text-[#C8B89A]">Wall</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <LayoutDashboard className="w-3.5 h-3.5 text-[#C8B89A]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold">
                Admin Panel
              </span>
            </div>
          </Link>

          <nav className="space-y-1.5 flex-1">
            {navItems.map(({ href, label, icon: Icon, match, superAdminOnly }) => {
              if (superAdminOnly && user?.role !== 'SUPERADMIN') return null;
              const active = match ? pathname.startsWith(match) : false;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className={navLinkClass(active)}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? 'text-[#C8B89A]' : 'text-white/40 group-hover:text-[#C8B89A]'
                    }`}
                  />
                  <span className={active ? 'font-medium' : 'font-normal'}>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
            {user && (
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-[#C8B89A]/20 border border-[#C8B89A]/30 flex items-center justify-center text-[#C8B89A] text-sm font-semibold">
                  {getInitials(user.firstName, user.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-white/45 truncate">{user.email}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/15 text-white/80 hover:bg-[#C8B89A] hover:text-[#1A1A1A] hover:border-[#C8B89A] transition-all duration-300 disabled:opacity-60"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {loggingOut ? 'Duke dalur...' : 'Dil'}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 border-b border-zinc-100 px-4 py-3 lg:px-8 lg:py-4 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 shrink-0"
              aria-label="Hap menunë"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
            <span className="text-[#C8B89A] text-[10px] font-bold uppercase tracking-[0.2em]">
              Swiss Wall Panels
            </span>
            <h2 className="text-base lg:text-lg font-light tracking-tight text-zinc-900 mt-0.5 truncate">{pageTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-zinc-100">
                <div className="w-9 h-9 rounded-full bg-[#C8B89A]/15 border border-[#C8B89A]/25 flex items-center justify-center text-[#1A1A1A] text-xs font-semibold">
                  {getInitials(user.firstName, user.lastName)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-900 leading-none">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">Administrator</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden lg:inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-sm disabled:opacity-60"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              {loggingOut ? 'Duke dalur...' : 'Dil'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans">
        <AuthProvider>
          {isLogin ? children : <AdminShell>{children}</AdminShell>}
        </AuthProvider>
      </body>
    </html>
  );
}
