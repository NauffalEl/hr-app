import type { UserRole } from '@prisma/client';
import { getCurrentSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Employee, User } from '@prisma/client';

export type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
  active: boolean;
  employee: Employee | null;
  mock: boolean;
};

export class ActionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  if (session.mock) {
    const role = process.env.MOCK_USER_ROLE;
    if (role !== 'HR_ADMIN' && role !== 'MANAGER' && role !== 'KARYAWAN') return null;
    return { userId: session.userId, email: session.email, role, active: true, employee: null, mock: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: true },
  });
  if (!user || !user.active) return null;
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    active: user.active,
    employee: user.employee ?? null,
    mock: false,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ActionError(401, 'Belum login');
  return ctx;
}

export async function requireRole(...roles: UserRole[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.role)) throw new ActionError(403, 'Akses ditolak');
  return ctx;
}

// Scope data: HR bebas; Manager hanya bawahan (atasanId = self) atau diri sendiri; Karyawan hanya diri.
export async function employeeScope(ctx: AuthContext, employeeId: string): Promise<boolean> {
  try {
    await assertEmployeeScope(ctx, employeeId);
    return true;
  } catch {
    return false;
  }
}

export async function assertEmployeeScope(ctx: AuthContext, employeeId: string): Promise<void> {
  if (ctx.role === 'HR_ADMIN') return;
  if (!ctx.employee) throw new ActionError(403, 'Akun belum terhubung ke data karyawan');
  if (ctx.employee.id === employeeId) return;
  if (ctx.role === 'MANAGER') {
    const target = await prisma.employee.findUnique({ where: { id: employeeId }, select: { atasanId: true } });
    if (target?.atasanId === ctx.employee.id) return;
  }
  throw new ActionError(403, 'Di luar lingkup akses');
}

export type { User };
