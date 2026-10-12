'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';
import { useFocusTrap } from '@/components/ui/use-focus-trap';
import { logout } from '@/app/_lib/actions';
import type { SessionUser } from '@/app/_lib/types';
import type { NavItem } from './nav';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/karyawan': 'Karyawan',
  '/kontrak': 'Kontrak',
  '/cuti': 'Cuti',
  '/dokumen': 'Dokumen',
  '/pengaturan': 'Pengaturan',
};

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/karyawan/baru')) return 'Tambah Karyawan';
  if (/^\/karyawan\/[^/]+\/edit/.test(pathname)) return 'Ubah Karyawan';
  if (pathname.startsWith('/karyawan/')) return 'Detail Karyawan';
  return TITLES[pathname] ?? 'HRIS';
}

/**
 * Shell aplikasi: sidebar desktop (slate-900) + topbar sticky + bottom nav
 * mobile + drawer "Lainnya" (focus trap + Escape). Item menu sudah difilter
 * role di server component.
 */
export function Shell({
  user,
  roleLabel,
  nav,
  bottomNav,
  drawerNav,
  children,
}: {
  user: SessionUser;
  roleLabel: string;
  nav: NavItem[];
  bottomNav: NavItem[];
  drawerNav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, startLogout] = useTransition();
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false));

  useEffect(() => setDrawerOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const navLinkCls = (active: boolean) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`;

  const handleLogout = () => {
    startLogout(async () => {
      try {
        const res = await logout();
        if (!res.ok && res.status >= 500) throw new Error(res.error);
        router.replace('/login');
        router.refresh();
      } catch {
        toast.error('Gagal keluar. Coba lagi.');
      }
    });
  };

  const userCard = (
    <div className="flex items-center gap-3">
      <Avatar nama={user.nama} size={32} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{user.nama}</p>
        <p className="truncate text-xs text-slate-400">{roleLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-900 lg:flex">
        <div className="px-4 py-5">
          <p className="text-lg font-bold text-white">HRIS</p>
          <p className="text-xs text-slate-400">{roleLabel}</p>
        </div>
        <nav aria-label="Menu utama" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className={navLinkCls(isActive(item.href))} aria-current={isActive(item.href) ? 'page' : undefined}>
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          {userCard}
          <Button
            variant="ghost"
            size="sm"
            loading={loggingOut}
            loadingLabel="Keluar…"
            onClick={handleLogout}
            className="mt-3 w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6 lg:shadow-none">
          <IconButton
            label="Buka menu"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 lg:text-base">
            {pageTitle(pathname)}
          </h1>
          <span className="hidden text-xs text-slate-500 sm:block">{user.email}</span>
          <Avatar nama={user.nama} size={32} />
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 lg:px-6 lg:pb-10 lg:pt-6 xl:px-8">{children}</main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-slate-200 bg-white lg:hidden"
      >
        {bottomNav.map((item) => {
          const active = isActive(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
              <span
                className={`h-1 w-1 rounded-full ${active ? 'bg-blue-600' : 'bg-transparent'}`}
                aria-hidden="true"
              />
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          className="flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500"
        >
          <Icon name="moreVertical" className="h-5 w-5" />
          Lainnya
        </button>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-72 flex-col bg-white p-4 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Menu Lainnya</p>
              <IconButton label="Tutup menu" onClick={() => setDrawerOpen(false)}>
                <Icon name="close" className="h-4 w-4" />
              </IconButton>
            </div>
            <nav className="flex-1 space-y-1" aria-label="Menu lainnya">
              {drawerNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive(item.href) ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Avatar nama={user.nama} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.nama}</p>
                  <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={loggingOut}
                loadingLabel="Keluar…"
                onClick={handleLogout}
                className="mt-3 w-full"
              >
                <Icon name="logout" className="h-4 w-4" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
