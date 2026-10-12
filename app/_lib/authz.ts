import { getAuthContext } from '@/lib/auth';
import type { Role, SessionUser } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  HR_ADMIN: 'HR Admin',
  MANAGER: 'Manager',
  KARYAWAN: 'Karyawan',
};

/**
 * Session user untuk guard + shell. null = belum login (redirect /login).
 * Sumber: lib/auth.ts getAuthContext() (Dimas) — role dari tabel users.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.active) return null;
  return {
    userId: ctx.userId,
    email: ctx.email,
    role: ctx.role as Role,
    employeeId: ctx.employee?.id ?? null,
    nama: ctx.employee?.nama ?? ctx.email,
    jabatan: ctx.employee?.jabatan ?? null,
  };
}
