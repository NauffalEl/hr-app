'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { wrap, type ActionResult } from '@/lib/actions/employees';

// Stats dashboard, scoped role: HR semua; Manager diri+bawahan; Karyawan diri saja.
export async function getDashboardStats(): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const today = (() => {
      const n = new Date();
      return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
    })();
    const in30 = new Date(today.getTime() + 30 * 86_400_000);

    const employeeScope =
      ctx.role === 'HR_ADMIN'
        ? {}
        : ctx.role === 'MANAGER'
          ? ctx.employee
            ? { OR: [{ id: ctx.employee.id }, { atasanId: ctx.employee.id }] }
            : { id: 'nonexistent' }
          : { userId: ctx.userId };

    const leaveScope =
      ctx.role === 'HR_ADMIN'
        ? {}
        : ctx.role === 'MANAGER'
          ? ctx.employee
            ? { OR: [{ employee: { id: ctx.employee.id } }, { employee: { atasanId: ctx.employee.id } }] }
            : { id: 'nonexistent' }
          : { employee: { userId: ctx.userId } };

    const contractScope =
      ctx.role === 'HR_ADMIN'
        ? {}
        : ctx.role === 'MANAGER'
          ? ctx.employee
            ? { employee: { OR: [{ id: ctx.employee.id }, { atasanId: ctx.employee.id }] } }
            : { employee: { id: 'nonexistent' } }
          : { employee: { userId: ctx.userId } };

    const [
      totalKaryawan,
      pendingCuti,
      kontrakSelesai30Hari,
      karyawanAktifKontrak,
      cutiDisetujuiBulanIni,
    ] = await Promise.all([
      prisma.employee.count({ where: employeeScope }),
      prisma.leaveRequest.count({ where: { ...leaveScope, status: 'PENDING' } }),
      prisma.contract.count({
        where: {
          ...contractScope,
          status: { in: ['AKTIF', 'UPCOMING'] },
          tanggalAkhir: { gte: today, lte: in30 },
        },
      }),
      prisma.contract.count({ where: { ...contractScope, status: 'AKTIF' } }),
      prisma.leaveRequest.count({
        where: {
          ...leaveScope,
          status: 'APPROVED',
          tanggalMulai: { gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)) },
        },
      }),
    ]);

    return {
      scope: ctx.role,
      totalKaryawan,
      pendingCuti,
      kontrakSelesai30Hari,
      karyawanAktifKontrak,
      cutiDisetujuiBulanIni,
    };
  });
}
