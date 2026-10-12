import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getContracts, getEmployees, getReminderLogs } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import type { ContractRow } from '@/app/_lib/types';
import { tgl } from '@/app/_lib/format';
import { Avatar } from '@/components/ui/avatar';
import { Badge, CONTRACT_LABEL, contractSisaBadge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { ExtendContractModal } from './extend-contract-modal';
import { ReminderLog } from './reminder-log';

export const metadata: Metadata = { title: 'Kontrak' };

const PAGE_SIZE = 20;

type SP = { status?: string; page?: string };

// Filter status → param query server-side (Aman = minSisaHari, § Bima #9).
const FILTERS: Record<string, { label: string; query: Record<string, unknown> }> = {
  semua: { label: 'Semua', query: {} },
  h7: { label: '≤7 hari', query: { maxSisaHari: 7 } },
  h30: { label: '≤30 hari', query: { maxSisaHari: 30 } },
  aman: { label: 'Aman', query: { minSisaHari: 31 } },
};

export default async function KontrakPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'HR_ADMIN') redirect('/dashboard'); // guard: /kontrak HR_ADMIN only

  const sp = await searchParams;
  const key = sp.status && FILTERS[sp.status] ? sp.status : 'semua';
  const page = Math.max(Number(sp.page) || 1, 1);

  const [listRes, empRes, logRes] = await Promise.all([
    getContracts({ ...FILTERS[key].query, page, pageSize: PAGE_SIZE }),
    getEmployees({ pageSize: 100 }),
    getReminderLogs({ pageSize: 20 }),
  ]);
  if (!listRes.ok) return <ErrorState message={listRes.error} />;

  const data = listRes.data;
  const employees = empRes.ok ? empRes.data.items.map((e) => ({ id: e.id, nama: e.nama })) : [];
  const logs = logRes.ok ? logRes.data.items : [];

  const hrefFor = (nextKey: string, p: number) =>
    nextKey === 'semua' && p === 1 ? '/kontrak' : `/kontrak?status=${nextKey}&page=${p}`;

  const columns: Column<ContractRow>[] = [
    {
      key: 'nama',
      label: 'Nama',
      render: (r) => (
        <span className="flex items-center gap-3">
          <Avatar nama={r.employee.nama} size={28} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900">{r.employee.nama}</span>
            <span className="block truncate text-xs text-slate-500">{r.employee.departemen}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'jenis',
      label: 'Jenis',
      render: (r) => (
        <Badge variant={r.jenis === 'PKWT' ? 'info' : r.jenis === 'PKWTT' ? 'success' : 'neutral'}>
          {CONTRACT_LABEL[r.jenis]}
        </Badge>
      ),
    },
    { key: 'mulai', label: 'Mulai', className: 'num whitespace-nowrap', render: (r) => tgl(r.tanggalMulai) },
    { key: 'akhir', label: 'Berakhir', className: 'num whitespace-nowrap', render: (r) => (r.tanggalAkhir ? tgl(r.tanggalAkhir) : '—') },
    {
      key: 'sisa',
      label: 'Sisa Hari',
      render: (r) => {
        const b = contractSisaBadge(r.sisaHari);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (r) => (
        <span className="relative z-10 inline-flex items-center justify-end gap-1">
          <a
            href={`/karyawan/${r.employee.id}`}
            aria-label={`Lihat ${r.employee.nama}`}
            title="Lihat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Icon name="eye" className="h-4 w-4" />
          </a>
          <ExtendContractModal
            employees={employees}
            contract={{ id: r.id, employeeId: r.employee.id, nama: r.employee.nama, jenis: r.jenis }}
          />
        </span>
      ),
    },
  ];

  const tabs = Object.entries(FILTERS).map(([k, v]) => ({
    href: k === 'semua' ? '/kontrak' : `/kontrak?status=${k}`,
    label: v.label,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">Kontrak</h1>
          <p className="text-sm text-slate-500">Pantau masa berlaku kontrak & log reminder email.</p>
        </div>
        <ExtendContractModal employees={employees} withLabel />
      </div>

      <Tabs items={tabs} active={key === 'semua' ? '/kontrak' : `/kontrak?status=${key}`} />

      <Card>
        <CardHeader title={`Kontrak ${FILTERS[key].label}`} />
        {data.items.length === 0 ? (
          <EmptyState
            icon="briefcase"
            title={key === 'semua' ? 'Belum ada kontrak' : 'Tidak ada kontrak pada filter ini'}
            description={key === 'semua' ? 'Buat kontrak lewat tombol Perpanjang Kontrak.' : 'Pilih filter lain untuk melihat kontrak.'}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data.items}
              getHref={(r) => `/karyawan/${r.employee.id}`}
              getRowLabel={(r) => `Lihat detail ${r.employee.nama}`}
              mobileCard={(r) => {
                const b = contractSisaBadge(r.sisaHari);
                return (
                  <div className="rounded-lg bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{r.employee.nama}</span>
                        <span className="block truncate text-xs text-slate-500">{r.employee.departemen}</span>
                      </span>
                      <Badge variant={b.variant}>{b.label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[13px] text-slate-500">
                      <Badge variant={r.jenis === 'PKWT' ? 'info' : r.jenis === 'PKWTT' ? 'success' : 'neutral'}>
                        {CONTRACT_LABEL[r.jenis]}
                      </Badge>
                      <span className="num">
                        {tgl(r.tanggalMulai)} — {r.tanggalAkhir ? tgl(r.tanggalAkhir) : '—'}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              hrefFor={(p) => hrefFor(key, p)}
            />
          </>
        )}
      </Card>

      <ReminderLog items={logs} />
    </div>
  );
}
