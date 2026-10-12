import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ActionError, assertEmployeeScope } from '@/lib/auth';
import { buildDocumentPdf, DOCUMENT_TYPES, type DocumentType } from '@/lib/pdf';
import { prisma } from '@/lib/prisma';
import { pathUuid } from '@/lib/validate';

type Ctx = { params: Promise<{ type: string; employeeId: string }> };

// GET /api/documents/[type]/[employeeId]?inline=1 — PDF pdf-lib; logic di lib/pdf.ts.
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { type, employeeId } = await params;
    const t = type as DocumentType;
    if (!DOCUMENT_TYPES.includes(t)) throw new ActionError(400, 'Jenis dokumen tidak dikenal');
    pathUuid(employeeId, 'employeeId');

    const ctx = await requireAuth();
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
    const bytes = await buildDocumentPdf(t, {
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
    });

    const inline = request.nextUrl.searchParams.get('inline') === '1';
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${t}-${emp.nik}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof ActionError) {
      return NextResponse.json({ ok: false, status: e.status, error: e.message }, { status: e.status });
    }
    console.error('[documents]', e);
    return NextResponse.json({ ok: false, status: 500, error: 'Kesalahan server' }, { status: 500 });
  }
}
