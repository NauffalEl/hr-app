'use server';

import { ContractStatus, ContractType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ActionError, requireRole } from '@/lib/auth';
import { wrap, type ActionResult } from '@/lib/actions/employees';
import { asRecord, reqStr, reqDate, reqEnum, optEnum, optInt, optStr, pagination, reqUuid } from '@/lib/validate';

const KONTRAK: readonly ContractType[] = ['PKWT', 'PKWTT', 'MAGANG'];
const STATUS: readonly ContractStatus[] = ['AKTIF', 'BERAKHIR', 'UPCOMING'];

// Kontrak 1 baris = 1 periode. Perpanjangan = INSERT row baru (bukan UPDATE).
export async function createContract(input: unknown): Promise<ActionResult<unknown>> {
  const res = await wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const employeeId = reqUuid(q, 'employeeId');
    const jenis = reqEnum(q, 'jenis', KONTRAK);
    const tanggalMulai = reqDate(q, 'tanggalMulai');
    const tanggalAkhir = q.tanggalAkhir === undefined || q.tanggalAkhir === null || q.tanggalAkhir === '' ? null : reqDate(q, 'tanggalAkhir');

    if (jenis === 'PKWTT' && tanggalAkhir) throw new ActionError(400, 'PKWTT tidak punya tanggalAkhir');
    if (jenis !== 'PKWTT' && !tanggalAkhir) throw new ActionError(400, `${jenis} wajib punya tanggalAkhir`);
    if (tanggalAkhir && tanggalAkhir.getTime() <= tanggalMulai.getTime()) {
      throw new ActionError(400, 'tanggalAkhir harus setelah tanggalMulai');
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new ActionError(404, 'Karyawan tidak ditemukan');

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: {
          employeeId,
          jenis,
          tanggalMulai,
          tanggalAkhir,
          status: 'AKTIF',
        },
      }),
      prisma.employee.update({ where: { id: employeeId }, data: { statusKontrak: jenis } }),
    ]);
    return contract;
  });
  return res;
}

export async function updateContract(input: unknown): Promise<ActionResult<unknown>> {
  const res = await wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const id = reqUuid(q, 'id');
    const data: Record<string, unknown> = {};
    if (q.status !== undefined) data.status = reqEnum(q, 'status', STATUS);
    if (q.tanggalAkhir !== undefined) {
      data.tanggalAkhir = q.tanggalAkhir === null || q.tanggalAkhir === '' ? null : reqDate(q, 'tanggalAkhir');
    }
    if (Object.keys(data).length === 0) throw new ActionError(400, 'Tidak ada field untuk diubah');
    try {
      return await prisma.contract.update({ where: { id }, data });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new ActionError(404, 'Kontrak tidak ditemukan');
      throw e;
    }
  });
  return res;
}

// min/maxSisaHari server-side (filter "Aman").
export async function listContracts(input: unknown): Promise<ActionResult<unknown>> {
  const res = await wrap(async () => {
    await requireRole('HR_ADMIN', 'MANAGER');
    const q = asRecord(input ?? {});
    const employeeId = optStr(q, 'employeeId', 64);
    const status = optEnum(q, 'status', STATUS);
    const jenis = optEnum(q, 'jenis', KONTRAK);
    const minSisaHari = optInt(q, 'minSisaHari', -100_000, 100_000);
    const maxSisaHari = optInt(q, 'maxSisaHari', -100_000, 100_000);
    if (minSisaHari !== undefined && maxSisaHari !== undefined && minSisaHari > maxSisaHari) {
      throw new ActionError(400, 'minSisaHari > maxSisaHari');
    }
    const { page, pageSize, skip, take } = pagination(q, 20);

    // Sisa hari hanya bermakna untuk kontrak ber tanggalAkhir; filter by sisa = filter di aplikasi.
    const rows = await prisma.contract.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status } : {}),
        ...(jenis ? { jenis } : {}),
        ...(minSisaHari !== undefined || maxSisaHari !== undefined ? { tanggalAkhir: { not: null } } : {}),
      },
      include: { employee: { select: { id: true, nama: true, nik: true, departemen: true } } },
      orderBy: { tanggalMulai: 'desc' },
    });

    const today = (() => {
      const n = new Date();
      return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
    })();

    const mapped = rows
      .map((c) => ({
        ...c,
        tanggalMulai: c.tanggalMulai.toISOString().slice(0, 10),
        tanggalAkhir: c.tanggalAkhir ? c.tanggalAkhir.toISOString().slice(0, 10) : null,
        sisaHari: c.tanggalAkhir
          ? Math.round((new Date(c.tanggalAkhir.getTime()).getTime() - today) / 86_400_000)
          : null,
      }))
      .filter((c) => {
        if (minSisaHari !== undefined && (c.sisaHari === null || c.sisaHari < minSisaHari)) return false;
        if (maxSisaHari !== undefined && (c.sisaHari === null || c.sisaHari > maxSisaHari)) return false;
        return true;
      });

    const total = mapped.length;
    const items = mapped.slice(skip, skip + take);
    return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1), items };
  });
  return res;
}

export async function listReminderLogs(input: unknown): Promise<ActionResult<unknown>> {
  const res = await wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input ?? {});
    const contractId = optStr(q, 'contractId', 64);
    const { page, pageSize, skip, take } = pagination(q, 20);
    const where: Prisma.ContractReminderLogWhereInput = contractId ? { contractId } : {};
    const [total, items] = await Promise.all([
      prisma.contractReminderLog.count({ where }),
      prisma.contractReminderLog.findMany({
        where,
        include: { contract: { include: { employee: { select: { nama: true, nik: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1), items };
  });
  return res;
}
