'use server';

import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ActionError, requireRole } from '@/lib/auth';
import { wrap, type ActionResult } from '@/lib/actions/employees';
import { sendTemplateEmail } from '@/lib/email';
import { asRecord, reqStr, reqEmail, reqEnum, optEnum, optStr, reqBool, pagination, reqTemplateKey } from '@/lib/validate';

const ROLES: readonly UserRole[] = ['HR_ADMIN', 'MANAGER', 'KARYAWAN'];
const ROLE_RANK: Record<UserRole, number> = { KARYAWAN: 1, MANAGER: 2, HR_ADMIN: 3 };

// Admin Supabase butuh SERVICE_ROLE_KEY; tanpa itu operasi auth = 501.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key || /your[-_]/i.test(key) || /your[-_]/i.test(url) || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
    throw new ActionError(501, 'Supabase admin belum dikonfigurasi (SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listUsers(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input ?? {});
    const role = optEnum(q, 'role', ROLES);
    const { page, pageSize, skip, take } = pagination(q);
    const where = role ? { role } : {};
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { employee: { select: { id: true, nama: true, nik: true, departemen: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1), items };
  });
}

// HR-only. User dibuat manual (tanpa auto-provision): Supabase Auth + row users.
export async function createUser(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const email = reqEmail(q);
    const role = reqEnum(q, 'role', ROLES);
    const employeeId = optStr(q, 'employeeId', 64) ?? null;

    const auth = adminClient().auth;
    const { data, error } = await auth.admin.createUser({
      email,
      password: reqStr(q, 'password', 128, 8),
      email_confirm: true,
    });
    if (error || !data.user) throw new ActionError(400, error?.message ?? 'Gagal membuat akun Supabase');

    try {
      const user = await prisma.user.create({ data: { id: data.user.id, email, role } });
      if (employeeId) {
        const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!emp) throw new ActionError(404, 'Karyawan tidak ditemukan');
        await prisma.employee.update({ where: { id: employeeId }, data: { userId: user.id } });
      }
      return user;
    } catch (e) {
      // Bersihkan akun auth bila row users gagal.
      await auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw e;
    }
  });
}

// HR only; tidak bisa menurunkan/mengubah role sendiri.
export async function updateUserRole(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const id = reqStr(q, 'id', 64);
    const role = reqEnum(q, 'role', ROLES);
    if (id === ctx.userId) throw new ActionError(400, 'Tidak bisa mengubah role sendiri');
    try {
      return await prisma.user.update({ where: { id }, data: { role } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new ActionError(404, 'User tidak ditemukan');
      throw e;
    }
  });
}

export async function setUserActive(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const id = reqStr(q, 'id', 64);
    const active = reqBool(q, 'active');
    if (id === ctx.userId && !active) throw new ActionError(400, 'Tidak bisa menonaktifkan diri sendiri');
    try {
      return await prisma.user.update({ where: { id }, data: { active } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new ActionError(404, 'User tidak ditemukan');
      throw e;
    }
  });
}

export async function listEmailTemplates(): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    return prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } });
  });
}

export async function saveEmailTemplate(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const key = reqTemplateKey(q);
    const subject = reqStr(q, 'subject', 255);
    const bodyHtml = reqStr(q, 'bodyHtml', 100_000);
    return prisma.emailTemplate.upsert({
      where: { key },
      create: { key, subject, bodyHtml },
      update: { subject, bodyHtml },
    });
  });
}

// Reset = hapus baris → kembali ke template bawaan seed.
export async function resetEmailTemplate(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const key = reqTemplateKey(q);
    try {
      await prisma.emailTemplate.delete({ where: { key } });
      return { reset: true };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new ActionError(404, 'Template tidak ditemukan');
      throw e;
    }
  });
}

export async function saveDocumentTemplate(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const key = reqTemplateKey(q);
    const name = reqStr(q, 'name', 128);
    const content = reqStr(q, 'content', 200_000);
    return prisma.documentTemplate.upsert({
      where: { key },
      create: { key, name, content },
      update: { name, content },
    });
  });
}

// Link recovery Supabase; tanpa SERVICE_ROLE_KEY = 501.
export async function resetUserPassword(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    await requireRole('HR_ADMIN');
    const q = asRecord(input);
    const email = reqEmail(q);
    const auth = adminClient().auth;
    const { data, error } = await auth.admin.generateLink({ type: 'recovery', email });
    if (error || !data) throw new ActionError(400, error?.message ?? 'Gagal membuat link recovery');
    // Link dikirim via email Supabase; jangan kembalikan link mentah ke client.
    await sendTemplateEmail({
      to: email,
      subject: 'Reset password HR App',
      html: `<p>Anda meminta reset password. Gunakan link recovery dari Supabase Auth untuk membuat password baru.</p>`,
    });
    return { requested: true };
  });
}
