'use server';

import { prisma } from '@/lib/prisma';
import { ActionError, requireAuth, assertEmployeeScope } from '@/lib/auth';
import { wrap, type ActionResult } from '@/lib/actions/employees';
import { buildDocumentPdf, DOCUMENT_TYPES, type DocumentType } from '@/lib/pdf';
import { asRecord, reqStr, optStr } from '@/lib/validate';

// Generate PDF surat. Data diambil dari DB (bukan dari client) — client hanya memilih jenis + target.
export async function generateDocument(input: unknown): Promise<ActionResult<unknown>> {
  return wrap(async () => {
    const ctx = await requireAuth();
    const q = asRecord(input);
    const type = reqStr(q, 'type', 16) as DocumentType;
    if (!DOCUMENT_TYPES.includes(type)) throw new ActionError(400, 'Jenis dokumen tidak dikenal');
    const employeeId = reqStr(q, 'employeeId', 64);
    await assertEmployeeScope(ctx, employeeId);

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        contracts: { orderBy: { tanggalMulai: 'desc' }, take: 1 },
        atasan: { select: { nama: true } },
        leaveRequests: { where: { status: 'APPROVED' }, orderBy: { tanggalMulai: 'desc' }, take: 1 },
      },
    });
    if (!emp) throw new ActionError(404, 'Karyawan tidak ditemukan');

    const now = new Date();
    const kontrak = emp.contracts[0];
    const leave = emp.leaveRequests[0];

    const data: Record<string, string | number> = {
      nama: emp.nama,
      nik: emp.nik,
      email: emp.email,
      jabatan: emp.jabatan,
      departemen: emp.departemen,
      tanggal_masuk: emp.tanggalMasuk.toISOString().slice(0, 10),
      status_kontrak: emp.statusKontrak,
      atasan: emp.atasan?.nama ?? '-',
      tanggal_cetak: now.toISOString().slice(0, 10),
      jenis_kontrak: kontrak?.jenis ?? emp.statusKontrak,
      kontrak_mulai: kontrak ? kontrak.tanggalMulai.toISOString().slice(0, 10) : '-',
      kontrak_akhir: kontrak?.tanggalAkhir ? kontrak.tanggalAkhir.toISOString().slice(0, 10) : '-',
      cuti_jenis: leave?.jenis ?? '-',
      cuti_mulai: leave ? leave.tanggalMulai.toISOString().slice(0, 10) : '-',
      cuti_akhir: leave ? leave.tanggalAkhir.toISOString().slice(0, 10) : '-',
      alasan: leave?.alasan ?? '-',
    };

    const bytes = await buildDocumentPdf(type, data);
    return { base64: Buffer.from(bytes).toString('base64'), filename: `${type}-${emp.nik}-${now.getTime()}.pdf` };
  });
}
