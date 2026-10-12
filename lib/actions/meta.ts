'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { wrap, type ActionResult } from '@/lib/actions/employees';

// Meta untuk dropdown/filter UI.
export async function getMeta(): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireAuth();
    const departemen = await prisma.employee.findMany({
      select: { departemen: true },
      distinct: ['departemen'],
      orderBy: { departemen: 'asc' },
    });
    const documentTemplates = await prisma.documentTemplate.findMany({
      select: { key: true, name: true },
      orderBy: { name: 'asc' },
    });
    return {
      roles: ['HR_ADMIN', 'MANAGER', 'KARYAWAN'],
      contractTypes: ['PKWT', 'PKWTT', 'MAGANG'],
      contractStatuses: ['AKTIF', 'BERAKHIR', 'UPCOMING'],
      leaveTypes: ['TAHUNAN', 'SAKIT', 'IZIN'],
      leaveStatuses: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      documentTypes: ['kontrak', 'keterangan', 'cuti'],
      documentTemplates: documentTemplates.map((d) => d.key),
      departemen: departemen.map((d) => d.departemen),
      tahun: [new Date().getUTCFullYear() - 1, new Date().getUTCFullYear(), new Date().getUTCFullYear() + 1],
    };
  });
}
