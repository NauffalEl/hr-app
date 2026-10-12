'use server';

import { ContractType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ActionError, requireAuth, requireRole, assertEmployeeScope } from '@/lib/auth';
import {
  asRecord, reqStr, reqEmail, reqDate, reqEnum, optStr, optEnum, optInt, pagination,
} from '@/lib/validate';

const KONTRAK: readonly ContractType[] = ['PKWT', 'PKWTT', 'MAGANG'];

const saldoTahun = () => new Date().getUTCFullYear();

export type ActionOk<T> = { ok: true; data: T };
export type ActionFail = { ok: false; status: number; error: string };
export type ActionResult<T> = ActionOk<T> | ActionFail;

export async function wrap<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, status: e.status, error: e.message };
    console.error('[action]', e);
    return { ok: false, status: 500, error: 'Kesalahan server' };
  }
}

// GET: cari/filter/paginasi + saldoCuti (TAHUNAN tahun berjalan) per baris. Scope role.
export async function listEmployees(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const q = asRecord(input ?? {});
    const search = optStr(q, 'q', 128);
    const departemen = optStr(q, 'departemen', 128);
    const statusKontrak = optEnum(q, 'statusKontrak', KONTRAK);
    const { page, pageSize, skip, take } = pagination(q);

    // Karyawan: hanya diri sendiri. Manager: diri + bawahan. HR: semua.
    const scopeWhere =
      ctx.role === 'KARYAWAN'
        ? { userId: ctx.userId }
        : ctx.role === 'MANAGER'
          ? ctx.employee
            ? { OR: [{ id: ctx.employee.id }, { atasanId: ctx.employee.id }] }
            : { id: 'nonexistent' }
          : {};

    const where = {
      AND: [
        scopeWhere,
        search
          ? {
              OR: [
                { nama: { contains: search, mode: 'insensitive' as const } },
                { nik: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {},
        departemen ? { departemen } : {},
        statusKontrak ? { statusKontrak } : {},
      ],
    };

    const [total, rows] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy: { nama: 'asc' },
        skip,
        take,
        include: {
          user: { select: { id: true, email: true, role: true, active: true } },
          atasan: { select: { id: true, nama: true } },
          leaveBalances: { where: { tahun: saldoTahun() }, take: 1 },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        nik: r.nik,
        nama: r.nama,
        email: r.email,
        jabatan: r.jabatan,
        departemen: r.departemen,
        tanggalMasuk: r.tanggalMasuk.toISOString().slice(0, 10),
        statusKontrak: r.statusKontrak,
        atasan: r.atasan,
        user: r.user,
        saldoCuti: r.leaveBalances[0]
          ? {
              tahun: saldoTahun(),
              saldoAwal: r.leaveBalances[0].saldoAwal,
              terpakai: r.leaveBalances[0].terpakai,
              sisa: Math.max(r.leaveBalances[0].saldoAwal - r.leaveBalances[0].terpakai, 0),
            }
          : null, // null = 'Belum diatur HR'
      })),
    };
  });
}

export async function getEmployee(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const q = asRecord(input ?? {});
    const id = reqStr(q, 'id', 64);
    await assertEmployeeScope(ctx, id);

    const r = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, active: true } },
        atasan: { select: { id: true, nama: true } },
        bawahan: { select: { id: true, nama: true } },
        contracts: { orderBy: { tanggalMulai: 'desc' } },
        leaveBalances: { orderBy: { tahun: 'desc' } },
      },
    });
    if (!r) throw new ActionError(404, 'Karyawan tidak ditemukan');
    return r;
  });
}

export async function createEmployee(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const data = {
      nik: reqStr(q, 'nik', 32),
      nama: reqStr(q, 'nama', 128),
      email: reqEmail(q),
      jabatan: reqStr(q, 'jabatan', 128),
      departemen: reqStr(q, 'departemen', 128),
      tanggalMasuk: reqDate(q, 'tanggalMasuk'),
      statusKontrak: reqEnum(q, 'statusKontrak', KONTRAK),
      atasanId: optStr(q, 'atasanId', 64) ?? null,
    };
    if (data.atasanId) {
      const atasan = await prisma.employee.findUnique({ where: { id: data.atasanId } });
      if (!atasan) throw new ActionError(400, 'atasanId tidak ditemukan');
    }
    try {
      return await prisma.employee.create({ data });
    } catch (e) {
      throw mapPrismaConflict(e);
    }
  });
}

export async function updateEmployee(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const id = reqStr(q, 'id', 64);
    const data: Record<string, unknown> = {};
    const str = (k: string, max: number) => { const v = optStr(q, k, max); if (v !== undefined) data[k] = v; };
    str('nik', 32); str('nama', 128); str('jabatan', 128); str('departemen', 128);
    if (q.email !== undefined) data.email = reqEmail(q);
    if (q.tanggalMasuk !== undefined) data.tanggalMasuk = reqDate(q, 'tanggalMasuk');
    if (q.statusKontrak !== undefined) data.statusKontrak = reqEnum(q, 'statusKontrak', KONTRAK);
    if (q.atasanId !== undefined) {
      const atasanId = optStr(q, 'atasanId', 64) ?? null;
      if (atasanId) {
        if (atasanId === id) throw new ActionError(400, 'atasanId tidak boleh diri sendiri');
        const atasan = await prisma.employee.findUnique({ where: { id: atasanId } });
        if (!atasan) throw new ActionError(400, 'atasanId tidak ditemukan');
      }
      data.atasanId = atasanId;
    }
    if (Object.keys(data).length === 0) throw new ActionError(400, 'Tidak ada field untuk diubah');
    try {
      return await prisma.employee.update({ where: { id }, data });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new ActionError(404, 'Karyawan tidak ditemukan');
      throw mapPrismaConflict(e);
    }
  });
}

export async function deleteEmployee(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const id = reqStr(q, 'id', 64);
    try {
      await prisma.employee.delete({ where: { id } });
      return { deleted: true };
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'P2025') throw new ActionError(404, 'Karyawan tidak ditemukan');
      if (code === 'P2003') throw new ActionError(409, 'Masih punya kontrak/cuti terkait');
      throw e;
    }
  });
}

export async function listDepartments(): Promise<ActionResult<string[]>> {
  return wrap(async () => {
    await requireAuth();
    const rows = await prisma.employee.findMany({ select: { departemen: true }, distinct: ['departemen'], orderBy: { departemen: 'asc' } });
    return rows.map((r) => r.departemen);
  });
}

function mapPrismaConflict(e: unknown): unknown {
  const code = (e as { code?: string }).code;
  if (code === 'P2002') return new ActionError(409, 'NIK atau email sudah dipakai');
  return e;
}
