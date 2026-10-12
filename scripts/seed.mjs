// Seed: template email + surat default + demo data (karyawan lintas departemen, kontrak, saldo cuti).
// Jalankan: npm run db:seed  (butuh DB lokal hidup)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_TEMPLATES = [
  {
    key: 'contract_reminder',
    subject: 'Reminder kontrak {{nama}} ({{milestone}})',
    bodyHtml: `<p>Halo Tim HR,</p><p>Kontrak karyawan berikut akan berakhir dalam <b>{{sisa_hari}} hari</b> ({{milestone}}):</p><ul><li>Nama: {{nama}} ({{nik}})</li><li>Jabatan: {{jabatan}} — {{departemen}}</li><li>Jenis: {{jenis}}</li><li>Periode: {{tanggal_mulai}} s/d {{tanggal_akhir}}</li></ul><p>Mohon segera diproses perpanjangan.</p>`,
  },
  {
    key: 'leave_submitted',
    subject: 'Pengajuan cuti {{nama_pemohon}} menunggu persetujuan',
    bodyHtml: `<p>Halo {{nama_approver}},</p><p>{{nama_pemohon}} mengajukan cuti {{jenis}} tanggal {{tanggal_mulai}} s/d {{tanggal_akhir}} ({{hari_kerja}} hari kerja).</p><p>Alasan: {{alasan}}</p>`,
  },
  {
    key: 'leave_approved',
    subject: 'Cuti {{nama_pemohon}} DISETUJI',
    bodyHtml: `<p>Pengajuan cuti {{jenis}} {{nama_pemohon}} tanggal {{tanggal_mulai}} s/d {{tanggal_akhir}} ({{hari_kerja}} hari kerja) telah DISETUJI.</p><p>Catatan approver: {{catatan}}</p>`,
  },
  {
    key: 'leave_rejected',
    subject: 'Cuti {{nama_pemohon}} DITOLAK',
    bodyHtml: `<p>Pengajuan cuti {{jenis}} {{nama_pemohon}} tanggal {{tanggal_mulai}} s/d {{tanggal_akhir}} telah DITOLAK.</p><p>Catatan approver: {{catatan}}</p>`,
  },
  {
    key: 'leave_cancelled',
    subject: 'Cuti {{nama_pemohon}} DIBATALKAN',
    bodyHtml: `<p>Pengajuan cuti {{jenis}} {{nama_pemohon}} tanggal {{tanggal_mulai}} s/d {{tanggal_akhir}} telah DIBATALKAN pemohon.</p>`,
  },
];

const DOCUMENT_TEMPLATES = [
  {
    key: 'surat_kontrak',
    name: 'Surat Kontrak Kerja',
    content: `# SURAT KONTRAK KERJA
Nomor: /HR/KTR/{{nik}}/{{tahun}}
Yang bertanda tangan di bawah ini:
Perusahaan: PT Contoh Nusantara
Dengan ini mengikatkan diri dalam hubungan kerja:
Nama: {{nama}}
NIK: {{nik}}
Jabatan: {{jabatan}}
Departemen: {{departemen}}
Jenis kontrak: {{jenis_kontrak}}
Tanggal masuk: {{tanggal_masuk}}
Masa kontrak: {{kontrak_mulai}} s/d {{kontrak_akhir}}
Atasan langsung: {{atasan}}
Demikian surat ini dibuat dengan sebenarnya.
Tanggal cetak: {{tanggal_cetak}}`,
  },
  {
    key: 'surat_keterangan',
    name: 'Surat Keterangan Kerja',
    content: `# SURAT KETERANGAN KERJA
Nomor: /HR/KET/{{nik}}/{{tahun}}
Dengan ini menerangkan bahwa:
Nama: {{nama}}
NIK: {{nik}}
Jabatan: {{jabatan}}
Departemen: {{departemen}}
Telah bekerja di PT Contoh Nusantara sejak {{tanggal_masuk}} dengan status {{status_kontrak}}.
Surat keterangan ini dibuat untuk keperluan yang bersangkutan.
Tanggal cetak: {{tanggal_cetak}}`,
  },
  {
    key: 'surat_cuti',
    name: 'Surat Izin Cuti',
    content: `# SURAT IZIN CUTI
Nomor: /HR/CUT/{{nik}}/{{tahun}}
Nama: {{nama}}
NIK: {{nik}}
Jabatan: {{jabatan}} — {{departemen}}
Jenis cuti: {{cuti_jenis}}
Tanggal: {{cuti_mulai}} s/d {{cuti_akhir}}
Alasan: {{alasan}}
Atasan langsung: {{atasan}}
Tanggal cetak: {{tanggal_cetak}}`,
  },
];

// Demo: users di Supabase Auth — lokal placeholder tidak punya auth server,
// jadi row users memakai uuid deterministik. Saat pakai Supabase sungguhan,
// buat akun via /pengaturan lalu set user_id karyawan.
const U = (n) => `11111111-1111-4111-8111-1111111111${String(n).padStart(2, '0')}`;
const E = (n) => `22222222-2222-4222-8222-2222222222${String(n).padStart(2, '0')}`;

async function main() {
  for (const t of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({ where: { key: t.key }, create: t, update: { subject: t.subject, bodyHtml: t.bodyHtml } });
  }
  for (const t of DOCUMENT_TEMPLATES) {
    await prisma.documentTemplate.upsert({ where: { key: t.key }, create: t, update: { name: t.name, content: t.content } });
  }

  // auth.users lokal tidak ada → lewati FK users bila gagal; karyawan tetap dibuat.
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO auth.users (id) VALUES ${[1, 2, 3, 4, 5].map((n) => `('${U(n)}')`).join(', ')} ON CONFLICT (id) DO NOTHING`);
  } catch (e) {
    console.warn('[seed] auth.users tidak tersedia (wajar di DB lokal tanpa Supabase Auth):', e.message);
  }

  const demo = [
    { n: 1, email: 'sari@contoh.id', role: 'HR_ADMIN', nik: 'NIK-0001', nama: 'Sari Melati', jabatan: 'HR Manager', departemen: 'HR', masuk: '2022-01-10', kontrak: 'PKWTT', atasan: null },
    { n: 2, email: 'dimas@contoh.id', role: 'MANAGER', nik: 'NIK-0002', nama: 'Dimas Prayoga', jabatan: 'Manager Operasional', departemen: 'Operasional', masuk: '2022-03-01', kontrak: 'PKWTT', atasan: E(1) },
    { n: 3, email: 'budi@contoh.id', role: 'KARYAWAN', nik: 'NIK-0003', nama: 'Budi Santoso', jabatan: 'Staff Gudang', departemen: 'Gudang', masuk: '2025-02-15', kontrak: 'PKWT', atasan: E(2) },
    { n: 4, email: 'rina@contoh.id', role: 'KARYAWAN', nik: 'NIK-0004', nama: 'Rina Wijaya', jabatan: 'Admin HR', departemen: 'HR', masuk: '2024-08-01', kontrak: 'MAGANG', atasan: E(1) },
    { n: 5, email: 'agus@contoh.id', role: 'KARYAWAN', nik: 'NIK-0005', nama: 'Agus Salim', jabatan: 'Staff Finance', departemen: 'Finance', masuk: '2023-05-20', kontrak: 'PKWT', atasan: E(1) },
  ];

  let fkOk = true;
  for (const d of demo) {
    try {
      await prisma.user.upsert({
        where: { id: U(d.n) },
        create: { id: U(d.n), email: d.email, role: d.role },
        update: { role: d.role },
      });
    } catch (e) {
      fkOk = false;
      console.warn(`[seed] users#${d.n} dilewati (FK auth.users):`, e.message);
    }
    await prisma.employee.upsert({
      where: { id: E(d.n) },
      create: {
        id: E(d.n),
        userId: fkOk ? U(d.n) : null,
        nik: d.nik, nama: d.nama, email: d.email, jabatan: d.jabatan, departemen: d.departemen,
        tanggalMasuk: new Date(`${d.masuk}T00:00:00.000Z`), statusKontrak: d.kontrak, atasanId: d.atasan,
      },
      update: { nama: d.nama, jabatan: d.jabatan, departemen: d.departemen, atasanId: d.atasan, statusKontrak: d.kontrak, userId: fkOk ? U(d.n) : null },
    });
  }

  const year = new Date().getUTCFullYear();
  const contracts = [
    { employeeId: E(2), jenis: 'PKWTT', mulai: '2022-03-01', akhir: null, status: 'AKTIF' },
    { employeeId: E(3), jenis: 'PKWT', mulai: `${year}-02-15`, akhir: `${year + 1}-02-14`, status: 'AKTIF' },
    { employeeId: E(4), jenis: 'MAGANG', mulai: `${year}-08-01`, akhir: `${year}-02-01`, status: 'BERAKHIR' },
    { employeeId: E(5), jenis: 'PKWT', mulai: `${year}-05-20`, akhir: `${year + 1}-05-19`, status: 'AKTIF' },
  ];
  for (const c of contracts) {
    const existing = await prisma.contract.findFirst({ where: { employeeId: c.employeeId, jenis: c.jenis, tanggalMulai: new Date(`${c.mulai}T00:00:00.000Z`) } });
    if (!existing) {
      await prisma.contract.create({
        data: {
          employeeId: c.employeeId, jenis: c.jenis,
          tanggalMulai: new Date(`${c.mulai}T00:00:00.000Z`),
          tanggalAkhir: c.akhir ? new Date(`${c.akhir}T00:00:00.000Z`) : null,
          status: c.status,
        },
      });
    }
  }

  // 1 saldo cuti per karyawan (TAHUNAN saja; SAKIT/IZIN tanpa saldo).
  await prisma.leaveBalance.upsert({
    where: { employeeId_tahun: { employeeId: E(3), tahun: year } },
    create: { employeeId: E(3), tahun: year, saldoAwal: 12, terpakai: 2 },
    update: {},
  });
  await prisma.leaveBalance.upsert({
    where: { employeeId_tahun: { employeeId: E(2), tahun: year } },
    create: { employeeId: E(2), tahun: year, saldoAwal: 12, terpakai: 0 },
    update: {},
  });

  console.log(`[seed] selesai: ${EMAIL_TEMPLATES.length} template email, ${DOCUMENT_TEMPLATES.length} template dokumen, ${demo.length} karyawan, ${contracts.length} kontrak, 2 saldo cuti ${year}.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
