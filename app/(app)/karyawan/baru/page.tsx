import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDepartments, getEmployees } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import { linkCls } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { EmployeeForm } from '@/components/forms/employee-form';

export const metadata: Metadata = { title: 'Tambah Karyawan' };

export default async function KaryawanBaruPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'KARYAWAN') redirect('/dashboard');
  if (user.role !== 'HR_ADMIN') redirect('/karyawan');

  const [empRes, deptRes] = await Promise.all([getEmployees({ pageSize: 100 }), getDepartments()]);
  if (!empRes.ok) return <ErrorState message={empRes.error} />;

  return (
    <div className="mx-auto max-w-3xl">
      <a href="/karyawan" className={`${linkCls('ghost', 'sm')} mb-3 -ml-2`}>
        <Icon name="arrowLeft" className="h-4 w-4" />
        Kembali ke daftar
      </a>
      <Card>
        <CardHeader title="Tambah Karyawan" />
        <CardBody>
          <EmployeeForm
            mode="create"
            atasanOptions={empRes.data.items.map((e) => ({ id: e.id, nama: e.nama }))}
            departemenOptions={deptRes.ok ? deptRes.data : []}
          />
        </CardBody>
      </Card>
    </div>
  );
}
