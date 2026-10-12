import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmployeeDetail, getLeaves } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import type { SaldoCuti } from '@/app/_lib/types';
import { hitungHariKerja } from '@/lib/leave';
import { Avatar } from '@/components/ui/avatar';
import { Badge, CONTRACT_LABEL, LEAVE_LABEL, leaveStatusBadge } from '@/components/ui/badge';
import { linkCls } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { tgl } from '@/app/_lib/format';
import { DeleteEmployeeButton } from '../delete-employee-button';
import { LeaveBalanceCard } from './leave-balance-card';

export const metadata: Metadata = { title: 'Detail Karyawan' };

function sisaHari(akhir: string | Date | null): number | null {
  if (!akhir) return null;
  const d = typeof akhir === 'string' ? new Date(akhir) : akhir;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((end - today) / 86_400_000);
}

function hariKerja(mulai: string | Date, akhir: string | Date): number {
  try {
    return hitungHariKerja(new Date(mulai), new Date(akhir));
  } catch {
    return 0;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 py-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </div>
  );
}

export default async function KaryawanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'KARYAWAN') redirect('/dashboard');

  const { id } = await params;
  const res = await getEmployeeDetail({ id });
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <ErrorState message={res.error} />;
  }
  const emp = res.data;
  const isHR = user.role === 'HR_ADMIN';

  const thisYear = new Date().getUTCFullYear();
  const balances: SaldoCuti[] = (emp.leaveBalances ?? []).map((b) => ({
    tahun: b.tahun,
    saldoAwal: b.saldoAwal,
    terpakai: b.terpakai,
    sisa: Math.max(b.saldoAwal - b.terpakai, 0),
  }));
  const saldoTahunIni = balances.find((b) => b.tahun === thisYear) ?? null;

  const contracts = emp.contracts ?? [];
  const aktif = contracts.find((c) => c.status === 'AKTIF') ?? null;

  const kontrakCols: Column<(typeof contracts)[number]>[] = [
    { key: 'jenis', label: 'Jenis', render: (c) => <Badge variant={c.jenis === 'PKWT' ? 'info' : c.jenis === 'PKWTT' ? 'success' : 'neutral'}>{CONTRACT_LABEL[c.jenis]}</Badge> },
    { key: 'mulai', label: 'Mulai', className: 'num whitespace-nowrap', render: (c) => tgl(c.tanggalMulai) },
    { key: 'akhir', label: 'Berakhir', className: 'num whitespace-nowrap', render: (c) => (c.tanggalAkhir ? tgl(c.tanggalAkhir) : '—') },
    {
      key: 'sisa',
      label: 'Sisa Hari',
      render: (c) => {
        const s = sisaHari(c.tanggalAkhir);
        if (s === null) return <span className="text-xs text-slate-500">Tanpa akhir</span>;
        const variant = s <= 7 ? 'dangerStrong' : s <= 30 ? 'warning' : 'neutral';
        return <Badge variant={variant}>{s} hari</Badge>;
      },
    },
    {
      key: 'dok',
      label: 'Dokumen',
      render: () => (
        <a href="/dokumen" className="relative z-10 inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:underline">
          <Icon name="fileText" className="h-4 w-4" />
          Surat
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header profil */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar nama={emp.nama} size={56} />
          <div>
            <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">{emp.nama}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">{emp.jabatan}</span>
              <Badge variant={aktif ? 'success' : 'neutral'}>
                {aktif ? `Aktif · ${CONTRACT_LABEL[emp.statusKontrak]}` : `Tidak aktif · ${CONTRACT_LABEL[emp.statusKontrak]}`}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/dokumen" className={linkCls('secondary', 'sm')}>
            <Icon name="fileText" className="h-4 w-4" />
            Buat Surat Keterangan
          </a>
          {isHR && (
            <>
              <a href={`/karyawan/${emp.id}/edit`} className={linkCls('primary', 'sm')}>
                <Icon name="edit" className="h-4 w-4" />
                Ubah
              </a>
              <DeleteEmployeeButton id={emp.id} nama={emp.nama} withLabel />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Kolom kiri: data diri + saldo cuti (HR) */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Data Diri" />
            <CardBody className="py-2">
              <dl className="divide-y divide-slate-100">
                <Row label="NIK"><span className="num">{emp.nik}</span></Row>
                <Row label="Email">{emp.email}</Row>
                <Row label="Departemen">{emp.departemen}</Row>
                <Row label="Atasan">{emp.atasan?.nama ?? '—'}</Row>
                <Row label="Tanggal Masuk"><span className="num">{tgl(emp.tanggalMasuk)}</span></Row>
                <Row label="Saldo Cuti">
                  {saldoTahunIni ? (
                    <span className="num">{saldoTahunIni.sisa} hari (sisa {thisYear})</span>
                  ) : (
                    <span className="text-slate-500">Belum diatur HR</span>
                  )}
                </Row>
                <Row label="Status Akun">
                  {emp.user ? (
                    <span>
                      {emp.user.role.replace('_', ' ')} · {emp.user.active ? 'aktif' : 'nonaktif'}
                    </span>
                  ) : (
                    <span className="text-slate-500">Belum ada akun login</span>
                  )}
                </Row>
              </dl>
            </CardBody>
          </Card>

          {isHR && <LeaveBalanceCard employeeId={emp.id} balances={balances} />}
        </div>

        {/* Kolom kanan: riwayat */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Riwayat Kontrak" />
            {contracts.length === 0 ? (
              <EmptyState icon="briefcase" title="Belum ada riwayat kontrak" description="Kontrak akan muncul di sini setelah dibuat HR." />
            ) : (
              <CardBody className="p-0">
                <DataTable
                  columns={kontrakCols}
                  rows={contracts}
                  mobileCard={(c) => {
                    const s = sisaHari(c.tanggalAkhir);
                    return (
                      <div className="rounded-lg bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={c.jenis === 'PKWT' ? 'info' : c.jenis === 'PKWTT' ? 'success' : 'neutral'}>
                            {CONTRACT_LABEL[c.jenis]}
                          </Badge>
                          {s === null ? (
                            <span className="text-xs text-slate-500">Tanpa akhir</span>
                          ) : (
                            <Badge variant={s <= 7 ? 'dangerStrong' : s <= 30 ? 'warning' : 'neutral'}>{s} hari</Badge>
                          )}
                        </div>
                        <p className="num mt-1 text-[13px] text-slate-500">
                          {tgl(c.tanggalMulai)} — {c.tanggalAkhir ? tgl(c.tanggalAkhir) : '—'}
                        </p>
                      </div>
                    );
                  }}
                />
              </CardBody>
            )}
          </Card>

          <RiwayatCuti leaveRows={emp.id} />
        </div>
      </div>
    </div>
  );
}

// Riwayat cuti diambil lewat listLeaves agar field approval ikut terbawa.
async function RiwayatCuti({ leaveRows }: { leaveRows: string }) {
  const res = await getLeaves({ employeeId: leaveRows, pageSize: 50 });
  if (!res.ok) return <ErrorState message={res.error} />;
  const items = res.data.items;

  const cols: Column<(typeof items)[number]>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      className: 'whitespace-nowrap',
      render: (l) => (
        <span className="num text-[13px]">
          {tgl(l.tanggalMulai)} — {tgl(l.tanggalAkhir)}
        </span>
      ),
    },
    { key: 'jenis', label: 'Jenis', render: (l) => <Badge variant="neutral">{LEAVE_LABEL[l.jenis]}</Badge> },
    {
      key: 'durasi',
      label: 'Durasi',
      align: 'right',
      render: (l) => <span className="num">{hariKerja(l.tanggalMulai, l.tanggalAkhir)} hari kerja</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (l) => {
        const b = leaveStatusBadge(l.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    { key: 'catatan', label: 'Catatan', render: (l) => <span className="text-[13px] text-slate-500">{l.catatanApprover ?? '—'}</span> },
  ];

  return (
    <Card>
      <CardHeader title="Riwayat Cuti" />
      {items.length === 0 ? (
        <EmptyState icon="calendar" title="Belum ada riwayat cuti" description="Pengajuan cuti karyawan akan tampil di sini." />
      ) : (
        <CardBody className="p-0">
          <DataTable
            columns={cols}
            rows={items}
            mobileCard={(l) => {
              const b = leaveStatusBadge(l.status);
              return (
                <div className="rounded-lg bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{LEAVE_LABEL[l.jenis]}</span>
                    <Badge variant={b.variant}>{b.label}</Badge>
                  </div>
                  <p className="num mt-1 text-[13px] text-slate-500">
                    {tgl(l.tanggalMulai)} — {tgl(l.tanggalAkhir)} · {hariKerja(l.tanggalMulai, l.tanggalAkhir)} hari kerja
                  </p>
                  {l.catatanApprover && <p className="mt-1 text-[13px] text-slate-500">Catatan: {l.catatanApprover}</p>}
                </div>
              );
            }}
          />
        </CardBody>
      )}
    </Card>
  );
}
