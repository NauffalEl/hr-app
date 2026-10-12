import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLeaves } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import type { LeaveRow } from '@/app/_lib/types';
import { tgl } from '@/app/_lib/format';
import { getLeaveBalance, hitungHariKerja } from '@/lib/leave';
import { Avatar } from '@/components/ui/avatar';
import { Badge, LEAVE_LABEL, leaveStatusBadge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { LeaveActions } from './leave-actions';
import { LeaveForm } from './leave-form';

export const metadata: Metadata = { title: 'Cuti' };

const PAGE_SIZE = 10;
type SP = { tab?: string; page?: string };

function durasi(l: LeaveRow): number {
  try {
    return hitungHariKerja(new Date(l.tanggalMulai), new Date(l.tanggalAkhir));
  } catch {
    return 0;
  }
}

export default async function CutiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const isApprover = user.role !== 'KARYAWAN';
  let tab = sp.tab === 'saya' || sp.tab === 'persetujuan' ? sp.tab : 'ajukan';
  if (tab === 'persetujuan' && !isApprover) tab = 'ajukan'; // guard: KARYAWAN tanpa approval
  const page = Math.max(Number(sp.page) || 1, 1);
  const thisYear = new Date().getUTCFullYear();

  const pendingCountRes = isApprover ? await getLeaves({ status: 'PENDING', pageSize: 1 }) : null;
  const pendingCount = pendingCountRes?.ok ? pendingCountRes.data.total : 0;

  let listRes: Awaited<ReturnType<typeof getLeaves>> | null = null;
  let saldo = null;
  if (tab === 'ajukan') {
    saldo = user.employeeId ? await getLeaveBalance(user.employeeId, thisYear) : null;
  } else if (tab === 'saya') {
    listRes = user.employeeId
      ? await getLeaves({ employeeId: user.employeeId, page, pageSize: PAGE_SIZE })
      : null;
  } else {
    listRes = await getLeaves({ status: 'PENDING', page, pageSize: PAGE_SIZE });
  }

  const data = listRes?.ok ? listRes.data : null;

  const tabs = [
    { href: '/cuti?tab=ajukan', label: 'Ajukan Cuti' },
    { href: '/cuti?tab=saya', label: 'Pengajuan Saya' },
    ...(isApprover
      ? [{ href: '/cuti?tab=persetujuan', label: 'Perlu Persetujuan', badge: pendingCount, badgeLabel: 'pengajuan menunggu' }]
      : []),
  ];
  const activeHref = `/cuti?tab=${tab}`;

  const cols: Column<LeaveRow>[] = [
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
    { key: 'durasi', label: 'Durasi', align: 'right', render: (l) => <span className="num">{durasi(l)} hari</span> },
    {
      key: 'status',
      label: 'Status',
      render: (l) => {
        const b = leaveStatusBadge(l.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    { key: 'catatan', label: 'Catatan Approver', render: (l) => <span className="text-[13px] text-slate-500">{l.catatanApprover ?? '—'}</span> },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (l) => <span className="relative z-10 inline-flex justify-end">{l.status === 'PENDING' && <LeaveActions leave={l} mode="mine" />}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">Cuti</h1>
        <p className="text-sm text-slate-500">Ajukan cuti, pantau riwayat, dan setujui pengajuan tim.</p>
      </div>

      <Tabs items={tabs} active={activeHref} />

      {tab === 'ajukan' && (
        <LeaveForm saldo={saldo} tahun={thisYear} />
      )}

      {tab === 'saya' && (
        <Card>
          <CardHeader title="Pengajuan Saya" />
          {!user.employeeId || !data || data.items.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Belum ada pengajuan"
              description="Pengajuan cuti Anda akan tampil di sini."
              action={
                <a href="/cuti?tab=ajukan" className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                  Ajukan Cuti
                </a>
              }
            />
          ) : (
            <>
              <DataTable
                columns={cols}
                rows={data.items}
                mobileCard={(l) => {
                  const b = leaveStatusBadge(l.status);
                  return (
                    <div className="rounded-lg bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">{LEAVE_LABEL[l.jenis]}</span>
                        <Badge variant={b.variant}>{b.label}</Badge>
                      </div>
                      <p className="num mt-1 text-[13px] text-slate-500">
                        {tgl(l.tanggalMulai)} — {tgl(l.tanggalAkhir)} · {durasi(l)} hari kerja
                      </p>
                      {l.catatanApprover && <p className="mt-1 text-[13px] text-slate-500">Catatan: {l.catatanApprover}</p>}
                      {l.status === 'PENDING' && (
                        <div className="mt-2 flex justify-end">
                          <LeaveActions leave={l} mode="mine" />
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                hrefFor={(p) => `/cuti?tab=saya&page=${p}`}
              />
            </>
          )}
        </Card>
      )}

      {tab === 'persetujuan' && (
        <div className="space-y-4">
          {pendingCount === 0 && (
            <Card>
              <EmptyState
                icon="checkCircle"
                title="Belum ada pengajuan yang menunggu persetujuan"
                description="Pengajuan baru dari tim Anda akan muncul di sini."
              />
            </Card>
          )}
          {data && data.items.length > 0 && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.items.map((l) => (
                  <ApprovalCard key={l.id} leave={l} />
                ))}
              </div>
              <Card>
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  total={data.total}
                  pageSize={data.pageSize}
                  hrefFor={(p) => `/cuti?tab=persetujuan&page=${p}`}
                />
              </Card>
            </>
          )}
        </div>
      )}

      {listRes && !listRes.ok && <ErrorState message={listRes.error} />}
    </div>
  );
}

function ApprovalCard({ leave }: { leave: LeaveRow }) {
  const days = (() => {
    try {
      return hitungHariKerja(new Date(leave.tanggalMulai), new Date(leave.tanggalAkhir));
    } catch {
      return 0;
    }
  })();
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar nama={leave.employee.nama} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{leave.employee.nama}</p>
              <p className="truncate text-xs text-slate-500">{leave.employee.departemen}</p>
            </div>
          </div>
          <Badge variant="neutral">{LEAVE_LABEL[leave.jenis]}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-slate-500">Tanggal</dt>
          <dd className="num text-right text-slate-900">
            {tgl(leave.tanggalMulai)} — {tgl(leave.tanggalAkhir)}
          </dd>
          <dt className="text-slate-500">Durasi</dt>
          <dd className="num text-right text-slate-900">{days} hari kerja</dd>
          <dt className="text-slate-500">Potong saldo</dt>
          <dd className="text-right text-slate-900">
            {leave.jenis === 'TAHUNAN' ? <span className="num">{days} hari</span> : 'Tidak'}
          </dd>
        </dl>

        <div className="rounded-md bg-slate-50 p-3 text-[13px] text-slate-700">
          <p className="font-medium text-slate-900">Alasan</p>
          <p className="mt-0.5">{leave.alasan}</p>
        </div>

        <LeaveActions leave={leave} mode="approval" />
      </CardBody>
    </Card>
  );
}
