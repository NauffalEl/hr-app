import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDepartments, getEmployeeDetail, getEmployees } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import type { ContractType } from '@/app/_lib/types';
import { linkCls } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { EmployeeForm } from '@/components/forms/employee-form';

export const metadata: Metadata = { title: 'Ubah Karyawan' };

function isoDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default async function KaryawanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'KARYAWAN') redirect('/dashboard');
  if (user.role !== 'HR_ADMIN') redirect('/karyawan');

  const { id } = await params;
  const [detailRes, empRes, deptRes] = await Promise.all([
    getEmployeeDetail({ id }),
    getEmployees({ pageSize: 100 }),
    getDepartments(),
  ]);
  if (!detailRes.ok) {
    if (detailRes.status === 404) notFound();
    return <ErrorState message={detailRes.error} />;
  }
  const emp = detailRes.data;

  return (
    <div className="mx-auto max-w-3xl">
      <a href={`/karyawan/${id}`} className={`${linkCls('ghost', 'sm')} mb-3 -ml-2`}>
        <Icon name="arrowLeft" className="h-4 w-4" />
        Kembali ke detail
      </a>
      <Card>
        <CardHeader title={`Ubah ${emp.nama}`} />
        <CardBody>
          <EmployeeForm
            mode="edit"
            id={id}
            initial={{
              nik: emp.nik,
              nama: emp.nama,
              email: emp.email,
              jabatan: emp.jabatan,
              departemen: emp.departemen,
              tanggalMasuk: isoDate(emp.tanggalMasuk),
              statusKontrak: emp.statusKontrak as ContractType,
              atasanId: emp.atasanId ?? null,
            }}
            atasanOptions={(empRes.ok ? empRes.data.items : [])
              .filter((e) => e.id !== id)
              .map((e) => ({ id: e.id, nama: e.nama }))}
            departemenOptions={deptRes.ok ? deptRes.data : []}
          />
        </CardBody>
      </Card>
    </div>
  );
}
