import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendTemplateEmail, renderTemplate } from '@/lib/email';

// Cron reminder kontrak: H-30 / H-14 / H-7 per PERIODE kontrak.
// Idempoten: claim-first INSERT contract_reminder_logs (UNIQUE contract_id+milestone+tanggal_mulai_periode).

const MILESTONES = [
  { days: 30, key: 'H30' as const },
  { days: 14, key: 'H14' as const },
  { days: 7, key: 'H7' as const },
];

export async function runReminderCron(today = new Date()) {
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const hrUsers = await prisma.user.findMany({ where: { role: 'HR_ADMIN', active: true }, select: { email: true } });
  if (hrUsers.length === 0) {
    console.warn('[reminder] tidak ada HR_ADMIN aktif; tidak ada penerima');
    return { checked: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const recipients = hrUsers.map((u) => u.email);

  const contracts = await prisma.contract.findMany({
    where: { status: { in: ['AKTIF', 'UPCOMING'] }, tanggalAkhir: { not: null } },
    include: { employee: true },
  });

  const tpl = await prisma.emailTemplate.findUnique({ where: { key: 'contract_reminder' } });

  let checked = 0, sent = 0, failed = 0, skipped = 0;

  for (const c of contracts) {
    if (!c.tanggalAkhir) continue;
    const akhir = new Date(c.tanggalAkhir.getTime());
    const sisaHari = Math.round((akhir.getTime() - todayUtc.getTime()) / 86_400_000);
    checked++;
    if (sisaHari < 0 || sisaHari > 30) continue;

    // Milestone yang berlaku sekarang = ambang terkecil yang sudah dilewati.
    const m = [...MILESTONES].reverse().find((x) => sisaHari <= x.days);
    if (!m) continue;

    const kirimKe = recipients.join(', ');
    try {
      await prisma.contractReminderLog.create({
        data: {
          contractId: c.id,
          milestone: m.key,
          tanggalMulaiPeriode: new Date(c.tanggalMulai.getTime()),
          status: 'FAILED',
          kirimKe,
          error: 'belum diproses',
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        skipped++;
        continue;
      }
      throw e;
    }

    const vars = {
      nama: c.employee.nama,
      nik: c.employee.nik,
      jabatan: c.employee.jabatan,
      departemen: c.employee.departemen,
      jenis: c.jenis,
      tanggal_mulai: c.tanggalMulai.toISOString().slice(0, 10),
      tanggal_akhir: akhir.toISOString().slice(0, 10),
      sisa_hari: String(sisaHari),
      milestone: m.key,
    };

    let lastError: string | null = null;
    let anySent = false;
    if (!tpl) {
      lastError = 'template contract_reminder tidak ada';
      console.warn('[reminder] template contract_reminder tidak ada');
    } else {
      const { subject, html } = renderTemplate(tpl, vars);
      for (const to of recipients) {
        const res = await sendTemplateEmail({ to, subject, html });
        if (res.sent) anySent = true;
        else {
          lastError = res.error ?? 'fallback console (tanpa RESEND_API_KEY valid)';
          console.warn(`[reminder] FAILED kontrak=${c.id} milestone=${m.key} ke=${to}: ${lastError}`);
        }
      }
    }

    await prisma.contractReminderLog.update({
      where: {
        contractId_milestone_tanggalMulaiPeriode: {
          contractId: c.id,
          milestone: m.key,
          tanggalMulaiPeriode: new Date(c.tanggalMulai.getTime()),
        },
      },
      data: { status: anySent ? 'SENT' : 'FAILED', error: lastError },
    });

    if (anySent) sent++;
    else failed++;
  }

  return { checked, sent, failed, skipped };
}
