import type { IconName } from '@/components/ui/icon';
import type { Role } from '@/app/_lib/types';

export type NavItem = { href: string; label: string; icon: IconName };

const ALL: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/karyawan', label: 'Karyawan', icon: 'users' },
  { href: '/kontrak', label: 'Kontrak', icon: 'briefcase' },
  { href: '/cuti', label: 'Cuti', icon: 'calendar' },
  { href: '/dokumen', label: 'Dokumen', icon: 'fileText' },
  { href: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
];

/** Menu role-aware — dipanggil di server component, menu bukan hak role tidak dirender (§7). */
export function buildNav(role: Role): NavItem[] {
  return ALL.filter((item) => {
    switch (item.href) {
      case '/karyawan':
        return role !== 'KARYAWAN';
      case '/kontrak':
      case '/pengaturan':
        return role === 'HR_ADMIN';
      default:
        return true;
    }
  });
}

/** Bottom nav mobile: Beranda · Karyawan · Cuti · Lainnya(drawer). */
export function buildBottomNav(role: Role): NavItem[] {
  return buildNav(role).filter((i) => ['/dashboard', '/karyawan', '/cuti'].includes(i.href));
}

/** Isi drawer "Lainnya": menu yang tidak ada di bottom nav. */
export function buildDrawerNav(role: Role): NavItem[] {
  const bottom = new Set(buildBottomNav(role).map((i) => i.href));
  return buildNav(role).filter((i) => !bottom.has(i.href));
}
