import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getEmployees } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { DocumentGenerator } from './document-generator';

export const metadata: Metadata = { title: 'Dokumen' };

const TYPES = [
  { key: 'kontrak', label: 'Surat Kontrak Kerja', desc: 'Periode & jenis kontrak karyawan.', icon: 'briefcase' as IconName },
  { key: 'keterangan', label: 'Surat Keterangan Kerja', desc: 'Bukti sedang bekerja di perusahaan.', icon: 'fileText' as IconName },
  { key: 'cuti', label: 'Surat Cuti', desc: 'Pengajuan cuti yang sudah disetujui.', icon: 'calendar' as IconName },
] as const;

type DocType = (typeof TYPES)[number]['key'];

export default async function DokumenPage({ searchParams }: { searchParams: Promise<{ jenis?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const jenis = (TYPES.find((t) => t.key === sp.jenis)?.key ?? 'kontrak') as DocType;
  const isHR = user.role === 'HR_ADMIN';

  const empRes = isHR ? await getEmployees({ pageSize: 100 }) : null;
  if (empRes && !empRes.ok) return <ErrorState message={empRes.error} />;
  const employees = empRes ? empRes.data.items.map((e) => ({ id: e.id, nama: e.nama })) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">Dokumen</h1>
        <p className="text-sm text-slate-500">Buat dan unduh surat resmi dalam format PDF.</p>
      </div>

      {/* Pilihan jenis surat */}
      <ul className="grid gap-3 sm:grid-cols-3">
        {TYPES.map((t) => {
          const active = t.key === jenis;
          return (
            <li key={t.key}>
              <a
                href={`/dokumen?jenis=${t.key}`}
                aria-current={active ? 'true' : undefined}
                className={`flex h-full items-start gap-3 rounded-lg border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Icon name={t.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{t.label}</span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">{t.desc}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {isHR && employees.length === 0 ? (
        <Card>
          <EmptyState icon="users" title="Belum ada karyawan" description="Tambahkan karyawan sebelum membuat surat." />
        </Card>
      ) : (
        <DocumentGenerator
          key={jenis}
          type={jenis}
          employees={employees}
          defaultEmployeeId={isHR ? '' : (user.employeeId ?? '')}
          canPickEmployee={isHR}
        />
      )}
    </div>
  );
}
