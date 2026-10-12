import { prisma } from '@/lib/prisma';
import { sendTemplateEmail } from '@/lib/email';
import { renderTemplate } from '@/lib/email';

// Hitung hari kerja (Senin-Jumat) dalam rentang, dibatasi tahun 2000-2100 dan maks 366 hari.
export function hitungHariKerja(mulai: Date, akhir: Date): number {
  const yM = mulai.getUTCFullYear();
  const yA = akhir.getUTCFullYear();
  if (yM < 2000 || yM > 2100 || yA < 2000 || yA > 2100) {
    throw new RangeError('Tanggal di luar rentang 2000-2100');
  }
  const dayMs = 86_400_000;
  const totalHari = Math.floor((akhir.getTime() - mulai.getTime()) / dayMs) + 1;
  if (totalHari < 1) throw new RangeError('Rentang tanggal tidak valid');
  if (totalHari > 366) throw new RangeError('Rentang cuti maksimal 366 hari');

  let count = 0;
  const cursor = new Date(mulai.getTime());
  while (cursor.getTime() <= akhir.getTime()) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

// null-aware: null = belum diatur HR.
export async function getLeaveBalance(employeeId: string, tahun: number) {
  const row = await prisma.leaveBalance.findUnique({
    where: { employeeId_tahun: { employeeId, tahun } },
  });
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employeeId,
    tahun: row.tahun,
    saldoAwal: row.saldoAwal,
    terpakai: row.terpakai,
    sisa: Math.max(row.saldoAwal - row.terpakai, 0),
  };
}

export async function sendLeaveTransitionEmail(params: {
  leaveId: string;
  to: string[];
  subject: string;
  templateKey: string;
  vars: Record<string, string>;
}): Promise<void> {
  const tpl = await prisma.emailTemplate.findUnique({ where: { key: params.templateKey } });
  for (const to of params.to) {
    if (!tpl) {
      // Template belum diisi → tetap log ke console, jangan senyap.
      console.warn(`[email] template "${params.templateKey}" tidak ada; email ke ${to} tidak terkirim`);
      continue;
    }
    const { subject, html } = renderTemplate(tpl, params.vars);
    const res = await sendTemplateEmail({
      to,
      subject: params.subject || subject,
      html,
    });
    if (!res.sent) {
      console.warn(`[email] FAILED leave=${params.leaveId} ke=${to} key=${params.templateKey} fallback=${res.fallback} error=${res.error ?? '-'}`);
    }
  }
}
