import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDepartments, getEmployees } from '@/app/_lib/actions';
import { getSessionUser, ROLE_LABEL } from '@/app/_lib/authz';
import type { EmployeeListItem } from '@/app/_lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge, CONTRACT_LABEL } from '@/components/ui/badge';
import { linkCls } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { Pagination } from '@/components/ui/pagination';
import { DeleteEmployeeButton } from './delete-employee-button';
import { KaryawanToolbar } from './toolbar';

export const metadata: Metadata = { title: 'Karyawan' };

const PAGE_SIZE = 20;

type SP = { q?: string; departemen?: string; statusKontrak?: string; page?: string };

function hrefWith(params: Record<string, string | undefined>, page: number): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  sp.set('page', String(page));
  return `/karyawan?${sp.toString()}`;
}

export default async function KaryawanPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'KARYAWAN') redirect('/dashboard'); // guard: /karyawan bukan KARYAWAN

  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const filters = {
    q: sp.q?.trim() ?? '',
    departemen: sp.departemen ?? '',
    statusKontrak: sp.statusKontrak ?? '',
  };
  const isHR = user.role === 'HR_ADMIN';

  const [listRes, deptRes] = await Promise.all([
    getEmployees({ ...filters, page, pageSize: PAGE_SIZE }),
    getDepartments(),
  ]);
  if (!listRes.ok) return <ErrorState message={listRes.error} />;

  const data = listRes.data;
  const departemenOptions = deptRes.ok ? deptRes.data : [];
  const hasFilter = Boolean(filters.q || filters.departemen || filters.statusKontrak);

  const columns: Column<EmployeeListItem>[] = [
    {
      key: 'nama',
      label: 'Nama',
      render: (r) => (
        <span className="flex items-center gap-3">
          <Avatar nama={r.nama} size={28} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900">{r.nama}</span>
            <span className="block truncate text-xs text-slate-500">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'nik', label: 'NIK', className: 'num whitespace-nowrap text-slate-700', render: (r) => r.nik },
    { key: 'jabatan', label: 'Jabatan', render: (r) => r.jabatan },
    { key: 'departemen', label: 'Departemen', render: (r) => r.departemen },
    {
      key: 'status',
      label: 'Status Kontrak',
      render: (r) => <Badge variant={r.statusKontrak === 'PKWT' ? 'info' : r.statusKontrak === 'PKWTT' ? 'success' : 'neutral'}>{CONTRACT_LABEL[r.statusKontrak]}</Badge>,
    },
    { key: 'masuk', label: 'Tanggal Masuk', className: 'whitespace-nowrap', render: (r) => <span className="num">{r.tanggalMasuk}</span> },
    {
      key: 'saldo',
      label: 'Saldo Cuti',
      align: 'right',
      render: (r) =>
        r.saldoCuti ? (
          <span className="num font-medium text-slate-900">{r.saldoCuti.sisa}</span>
        ) : (
          <span className="text-xs text-slate-400">Belum diatur</span>
        ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (r) => (
        <span className="relative z-10 inline-flex items-center justify-end gap-1">
          <a
            href={`/karyawan/${r.id}`}
            aria-label={`Lihat ${r.nama}`}
            title="Lihat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Icon name="eye" className="h-4 w-4" />
          </a>
          {isHR && (
            <>
              <a
                href={`/karyawan/${r.id}/edit`}
                aria-label={`Ubah ${r.nama}`}
                title="Ubah"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Icon name="edit" className="h-4 w-4" />
              </a>
              <DeleteEmployeeButton id={r.id} nama={r.nama} />
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">Karyawan</h1>
          <p className="text-sm text-slate-500">
            {ROLE_LABEL[user.role]} melihat {user.role === 'HR_ADMIN' ? 'seluruh' : 'lingkup'} data karyawan
          </p>
        </div>
        {isHR && (
          <a href="/karyawan/baru" className={linkCls('primary', 'md')}>
            <Icon name="plus" className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Karyawan</span>
          </a>
        )}
      </div>

      <KaryawanToolbar initial={filters} departemenOptions={departemenOptions} />

      <Card>
        {data.items.length === 0 ? (
          hasFilter ? (
            <EmptyState
              icon="search"
              title="Tidak ada karyawan yang cocok"
              description="Coba ubah kata kunci atau reset filter."
              action={
                <a href="/karyawan" className={linkCls('secondary', 'sm')}>
                  Reset filter
                </a>
              }
            />
          ) : (
            <EmptyState
              icon="users"
              title="Belum ada karyawan"
              description="Tambahkan karyawan pertama untuk mulai mengelola data."
              action={
                isHR ? (
                  <a href="/karyawan/baru" className={linkCls('primary', 'sm')}>
                    Tambah Karyawan
                  </a>
                ) : undefined
              }
            />
          )
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data.items}
              getHref={(r) => `/karyawan/${r.id}`}
              getRowLabel={(r) => `Lihat detail ${r.nama}`}
              mobileCard={(r) => (
                <div className="rounded-lg bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar nama={r.nama} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{r.nama}</span>
                        <span className="block truncate text-xs text-slate-500">{r.jabatan}</span>
                      </span>
                    </span>
                    <Badge variant={r.statusKontrak === 'PKWT' ? 'info' : r.statusKontrak === 'PKWTT' ? 'success' : 'neutral'}>
                      {CONTRACT_LABEL[r.statusKontrak]}
                    </Badge>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
                    <span className="truncate">{r.departemen}</span>
                    <span className="num truncate text-right">NIK {r.nik}</span>
                    <span className="num">{r.tanggalMasuk}</span>
                    <span className="text-right">
                      Saldo:{' '}
                      {r.saldoCuti ? (
                        <span className="num font-medium text-slate-900">{r.saldoCuti.sisa} hari</span>
                      ) : (
                        <span className="text-slate-400">Belum diatur</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              hrefFor={(p) => hrefWith(filters, p)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
