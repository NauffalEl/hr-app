import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getEmployees, getEmailTemplates, getMeta, getUsers } from '@/app/_lib/actions';
import { getSessionUser } from '@/app/_lib/authz';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Tabs } from '@/components/ui/tabs';
import { TemplatePanel } from './template-panel';
import { UsersPanel } from './users-panel';

export const metadata: Metadata = { title: 'Pengaturan' };

type SP = { tab?: string };

export default async function PengaturanPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'HR_ADMIN') redirect('/dashboard'); // guard: HR_ADMIN only

  const sp = await searchParams;
  const tab = sp.tab === 'template' ? 'template' : 'pengguna';

  const [usersRes, tplRes, metaRes, empRes] = await Promise.all([
    getUsers({ pageSize: 100 }),
    getEmailTemplates(),
    getMeta(),
    getEmployees({ pageSize: 100 }),
  ]);

  if (!usersRes.ok) return <ErrorState message={usersRes.error} />;

  const employees = empRes.ok ? empRes.data.items.map((e) => ({ id: e.id, nama: e.nama })) : [];
  const documentKeys = metaRes.ok ? metaRes.data.documentTemplates : [];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold leading-tight text-slate-900 lg:text-2xl">Pengaturan</h1>
        <p className="text-sm text-slate-500">Kelola pengguna, role, dan template email/dokumen.</p>
      </div>

      <Tabs
        items={[
          { href: '/pengaturan?tab=pengguna', label: 'Pengguna & Role' },
          { href: '/pengaturan?tab=template', label: 'Template' },
        ]}
        active={`/pengaturan?tab=${tab}`}
      />

      {tab === 'pengguna' ? (
        <UsersPanel users={usersRes.data.items} employees={employees} selfId={user.userId} />
      ) : tplRes.ok ? (
        <TemplatePanel emailTemplates={tplRes.data} documentKeys={documentKeys} />
      ) : (
        <Card className="p-4 text-sm text-red-600">{tplRes.error}</Card>
      )}
    </div>
  );
}
