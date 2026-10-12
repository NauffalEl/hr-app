'use server';

import { LeaveStatus, LeaveType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ActionError, requireAuth, requireRole, assertEmployeeScope } from '@/lib/auth';
import { wrap, type ActionResult } from '@/lib/actions/employees';
import { hitungHariKerja, getLeaveBalance, sendLeaveTransitionEmail } from '@/lib/leave';
import { asRecord, reqStr, reqDate, reqEnum, optEnum, optInt, optStr, pagination, reqUuid, reqInt } from '@/lib/validate';

const JENIS: readonly LeaveType[] = ['TAHUNAN', 'SAKIT', 'IZIN'];
const STATUS: readonly LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export async function submitLeave(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    if (!ctx.employee) throw new ActionError(400, 'Akun belum terhubung ke data karyawan');
    const q = asRecord(input);
    const jenis = reqEnum(q, 'jenis', JENIS);
    const tanggalMulai = reqDate(q, 'tanggalMulai');
    const tanggalAkhir = reqDate(q, 'tanggalAkhir');
    const alasan = reqStr(q, 'alasan', 2000);
    if (tanggalAkhir.getTime() < tanggalMulai.getTime()) throw new ActionError(400, 'tanggalAkhir sebelum tanggalMulai');

    let hariKerja: number;
    try {
      hariKerja = hitungHariKerja(tanggalMulai, tanggalAkhir);
    } catch (e) {
      throw new ActionError(400, e instanceof RangeError ? e.message : 'Rentang tanggal tidak valid');
    }

    if (jenis === 'TAHUNAN') {
      const saldo = await getLeaveBalance(ctx.employee.id, tanggalMulai.getUTCFullYear());
      if (!saldo) throw new ActionError(400, 'Belum diatur HR');
      if (saldo.sisa < hariKerja) throw new ActionError(400, `Saldo tidak cukup (sisa ${saldo.sisa}, butuh ${hariKerja})`);
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: ctx.employee.id,
        jenis,
        tanggalMulai,
        tanggalAkhir,
        alasan,
        status: 'PENDING',
        approverId: ctx.employee.atasanId,
      },
    });

    if (ctx.employee.atasanId) {
      const approver = await prisma.employee.findUnique({ where: { id: ctx.employee.atasanId } });
      if (approver) {
        await sendLeaveTransitionEmail({
          leaveId: leave.id,
          to: [approver.email],
          subject: 'Pengajuan cuti menunggu persetujuan',
          templateKey: 'leave_submitted',
          vars: {
            nama_pemohon: ctx.employee.nama,
            nama_approver: approver.nama,
            jenis,
            tanggal_mulai: tanggalMulai.toISOString().slice(0, 10),
            tanggal_akhir: tanggalAkhir.toISOString().slice(0, 10),
            hari_kerja: String(hariKerja),
            alasan,
          },
        });
      }
    }

    return leave;
  });
}

async function transitionLeave(params: {
  leaveId: string;
  to: LeaveStatus;
  catatan: string | null;
  approverEmail: string;
  approverName: string;
  decrementBalance: boolean;
}) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: params.leaveId },
    include: { employee: true },
  });
  if (!leave) throw new ActionError(404, 'Pengajuan cuti tidak ditemukan');

  let hariKerja = 0;
  try {
    hariKerja = hitungHariKerja(new Date(leave.tanggalMulai.getTime()), new Date(leave.tanggalAkhir.getTime()));
  } catch {
    hariKerja = 0;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.updateMany({
      where: { id: params.leaveId, status: 'PENDING' },
      data: {
        status: params.to,
        approverId: leave.approverId ?? null,
        catatanApprover: params.catatan,
      },
    });
    if (updated.count === 0) throw new ActionError(409, 'Bukan berstatus PENDING');

    if (params.decrementBalance && leave.jenis === 'TAHUNAN') {
      const tahun = new Date(leave.tanggalMulai.getTime()).getUTCFullYear();
      const upd = await tx.leaveBalance.updateMany({
        where: { employeeId: leave.employeeId, tahun },
        data: { terpakai: { increment: hariKerja } },
      });
      if (upd.count === 0) throw new ActionError(400, 'Belum diatur HR');
      const bal = await tx.leaveBalance.findUnique({
        where: { employeeId_tahun: { employeeId: leave.employeeId, tahun } },
      });
      if (bal && bal.terpakai > bal.saldoAwal) throw new ActionError(400, 'Saldo tidak cukup');
    }

    return tx.leaveRequest.findUnique({ where: { id: params.leaveId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

  const vars = {
    nama_pemohon: leave.employee.nama,
    nama_approver: params.approverName,
    jenis: leave.jenis,
    tanggal_mulai: new Date(leave.tanggalMulai.getTime()).toISOString().slice(0, 10),
    tanggal_akhir: new Date(leave.tanggalAkhir.getTime()).toISOString().slice(0, 10),
    hari_kerja: String(hariKerja),
    status: params.to,
    catatan: params.catatan ?? '-',
  };

  await sendLeaveTransitionEmail({
    leaveId: leave.id,
    to: [leave.employee.email, params.approverEmail],
    subject: `Pengajuan cuti ${params.to === 'APPROVED' ? 'DISETUJI' : params.to === 'REJECTED' ? 'DITOLAK' : params.to}`,
    templateKey: params.to === 'APPROVED' ? 'leave_approved' : params.to === 'REJECTED' ? 'leave_rejected' : 'leave_cancelled',
    vars,
  });

  return result;
}

export async function approveLeave(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const q = asRecord(input);
    const id = reqUuid(q, 'id');
    const catatan = optStr(q, 'catatan', 2000) ?? null;

    const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
    if (!leave) throw new ActionError(404, 'Pengajuan cuti tidak ditemukan');

    if (ctx.role !== 'HR_ADMIN') {
      if (!ctx.employee || leave.employee.atasanId !== ctx.employee.id) {
        throw new ActionError(403, 'Hanya atasan/HR yang boleh menyetujui');
      }
    }

    return await transitionLeave({
      leaveId: id,
      to: 'APPROVED',
      catatan,
      approverEmail: ctx.employee?.email ?? ctx.email,
      approverName: ctx.employee?.nama ?? ctx.email,
      decrementBalance: true,
    });
  });
}

export async function rejectLeave(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const q = asRecord(input);
    const id = reqUuid(q, 'id');
    const catatan = optStr(q, 'catatan', 2000) ?? null;

    const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
    if (!leave) throw new ActionError(404, 'Pengajuan cuti tidak ditemukan');

    if (ctx.role !== 'HR_ADMIN') {
      if (!ctx.employee || leave.employee.atasanId !== ctx.employee.id) {
        throw new ActionError(403, 'Hanya atasan/HR yang boleh menolak');
      }
    }

    return await transitionLeave({
      leaveId: id,
      to: 'REJECTED',
      catatan,
      approverEmail: ctx.employee?.email ?? ctx.email,
      approverName: ctx.employee?.nama ?? ctx.email,
      decrementBalance: false,
    });
  });
}

export async function cancelLeave(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    if (!ctx.employee) throw new ActionError(400, 'Akun belum terhubung ke data karyawan');
    const q = asRecord(input);
    const id = reqUuid(q, 'id');

    const updated = await prisma.leaveRequest.updateMany({
      where: { id, employeeId: ctx.employee.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (updated.count === 0) throw new ActionError(409, 'Hanya pengajuan PENDING milik sendiri yang bisa dibatalkan');
    return { id, status: 'CANCELLED' as const };
  });
}

export async function listLeaves(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const q = asRecord(input ?? {});
    const status = optEnum(q, 'status', STATUS);
    const jenis = optEnum(q, 'jenis', JENIS);
    const employeeId = optStr(q, 'employeeId', 64);
    const { page, pageSize, skip, take } = pagination(q);

    let scope: Prisma.LeaveRequestWhereInput = {};
    if (ctx.role === 'KARYAWAN') scope = { employee: { userId: ctx.userId } };
    else if (ctx.role === 'MANAGER') {
      scope = ctx.employee
        ? { OR: [{ employee: { id: ctx.employee.id } }, { employee: { atasanId: ctx.employee.id } }] }
        : { id: 'nonexistent' };
    }

    const where: Prisma.LeaveRequestWhereInput = {
      AND: [scope, status ? { status } : {}, jenis ? { jenis } : {}, employeeId ? { employeeId } : {}],
    };

    const [total, items] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { id: true, nama: true, nik: true, departemen: true } },
          approver: { select: { id: true, nama: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1), items };
  });
}

// HR-only upsert; validasi tahun/saldo; tolak turun di bawah terpakai.
export async function setLeaveBalance(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const employeeId = reqUuid(q, 'employeeId');
    const tahun = reqInt(q, 'tahun', 2000, 2100);
    const saldoAwal = reqInt(q, 'saldoAwal', 0, 366);

    const existing = await getLeaveBalance(employeeId, tahun);
    if (existing && saldoAwal < existing.terpakai) {
      throw new ActionError(400, `saldoAwal < terpakai (${existing.terpakai})`);
    }

    // Upsert tanpa reset terpakai.
    return await prisma.leaveBalance.upsert({
      where: { employeeId_tahun: { employeeId, tahun } },
      create: { employeeId, tahun, saldoAwal, terpakai: 0 },
      update: { saldoAwal },
    });
  });
}

export { getLeaveBalance };
