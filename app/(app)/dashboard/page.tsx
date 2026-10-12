import type { Metadata } from 'next';
import { getContracts, getDashboard, getEmployees, getLeaves } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import type { ContractRow, EmployeeListItem } from '@/app/_lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge, contractSisaBadge } from '@/components/ui/badge';
import { linkCls } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon, type IconName } from '@/components/ui/icon';

export const metadata: Metadata = { title: 'Dashboard' };

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  accent?: 'amber' | 'blue';
  icon: IconName;
}) {
  const strip =
    accent === 'amber' ? 'border-l-amber-500' : accent === 'blue' ? 'border-l-blue-600' : 'border-l-transparent';
  return (
    <Card className={`border-l-4 ${strip}`}>
      <CardBody className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <Icon name={icon} className="h-4 w-4 text-slate-300" />
        </div>
        <p className="num mt-1 text-2xl font-bold leading-tight text-slate-900 lg:text-[30px]">{value}</p>
        {sub && <div className="mt-1 text-xs">{sub}</div>}
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const isKaryawan = user?.role === 'KARYAWAN';

  const [statsRes, headcountRes, cutiPendingRes, kontrakSoonRes, sisa7Res] = await Promise.all([
    getDashboard(),
    getEmployees({ pageSize: 100 }),
    isKaryawan ? Promise.resolve(null) : getLeaves({ status: 'PENDING', pageSize: 1 }),
    isKaryawan ? Promise.resolve(null) : getContracts({ maxSisaHari: 30, pageSize: 5 }),
    isKaryawan ? Promise.resolve(null) : getContracts({ maxSisaHari: 7, pageSize: 1 }),
  ]);

  if (!statsRes.ok) return <ErrorState message={statsRes.error} />;
  const stats = statsRes.data;

  const employees: EmployeeListItem[] = headcountRes.ok ? headcountRes.data.items : [];
  const perDept = new Map<string, number>();
  for (const e of employees) perDept.set(e.departemen, (perDept.get(e.departemen) ?? 0) + 1);
  const sorted = [...perDept.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6);
  const restTotal = sorted.slice(6).reduce((sum, [, n]) => sum + n, 0);
  const bars: [string, number][] = restTotal > 0 ? [...top, ['Lainnya', restTotal]] : top;
  const maxBar = Math.max(...bars.map(([, n]) => n), 1);

  const kontrakSoon: ContractRow[] = kontrakSoonRes?.ok ? kontrakSoonRes.data.items : [];
  const sisa7 = sisa7Res?.ok ? sisa7Res.data.total : null;
  const pendingCount = cutiPendingRes?.ok ? cutiPendingRes.data.total : stats.pendingCuti;

  const now = new Date();
  const tanggal = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const sapaan =
    now.getHours() < 11 ? 'Selamat pagi' : now.getHours() < 15 ? 'Selamat siang' : now.getHours() < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div className="space-y-4">
      {/* Header + shortcut aksi (disembunyikan bila bukan hak role) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {sapaan}, {user?.nama} · {tanggal}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/cuti?tab=ajukan" className={linkCls('secondary', 'sm')}>
            <Icon name="calendar" className="h-4 w-4" />
            Ajukan Cuti
          </a>
          {user?.role === 'HR_ADMIN' && (
            <a href="/karyawan/baru" className={linkCls('primary', 'sm')}>
              <Icon name="plus" className="h-4 w-4" />
              Tambah Karyawan
            </a>
          )}
        </div>
      </div>

      {/* Stat cards: 2 kolom mobile (ketiga col-span-2), 3 kolom desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Karyawan" value={stats.totalKaryawan} icon="users" accent="blue" />
        <StatCard
          label="Kontrak Berakhir ≤30 Hari"
          value={stats.kontrakSelesai30Hari}
          icon="briefcase"
          accent="amber"
          sub={
            sisa7 !== null ? (
              <span className="text-red-600">
                <span className="num">{sisa7}</span> di antaranya ≤7 hari
              </span>
            ) : undefined
          }
        />
        {!isKaryawan && (
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              label="Cuti Menunggu Persetujuan"
              value={stats.pendingCuti}
              icon="calendar"
              accent="amber"
              sub={
                pendingCount > 0 ? (
                  <a href="/cuti?tab=persetujuan" className="font-medium text-blue-600 hover:underline">
                    Lihat pengajuan
                  </a>
                ) : (
                  <span>Tidak ada antrean</span>
                )
              }
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Headcount per Departemen" />
          <CardBody>
            {bars.length === 0 ? (
              <EmptyState
                icon="users"
                title="Belum ada data karyawan"
                description="Tambahkan karyawan untuk melihat headcount per departemen."
              />
            ) : (
              <ul className="space-y-3">
                {bars.map(([dept, n]) => (
                  <li key={dept} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
                    <span className="truncate text-slate-700">{dept}</span>
                    <span className="num font-semibold text-slate-900">{n}</span>
                    <div
                      className="col-span-2 h-2 rounded-full bg-slate-100"
                      role="img"
                      aria-label={`${dept}: ${n} karyawan`}
                    >
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.round((n / maxBar) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {user?.role === 'HR_ADMIN' && (
          <Card>
            <CardHeader
              title="Kontrak ≤30 Hari"
              action={
                <a href="/kontrak" className="text-[13px] font-medium text-blue-600 hover:underline">
                  Lihat semua
                </a>
              }
            />
            <CardBody className="p-0">
              {kontrakSoon.length === 0 ? (
                <EmptyState
                  icon="briefcase"
                  title="Tidak ada kontrak mendekati akhir"
                  description="Semua masa berlaku kontrak masih aman."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {kontrakSoon.map((c) => {
                    const b = contractSisaBadge(c.sisaHari);
                    return (
                      <li key={c.id}>
                        <a
                          href={`/karyawan/${c.employee.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Avatar nama={c.employee.nama} size={28} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-900">
                                {c.employee.nama}
                              </span>
                              <span className="block truncate text-xs text-slate-500">{c.employee.departemen}</span>
                            </span>
                          </span>
                          <Badge variant={b.variant}>{b.label}</Badge>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
