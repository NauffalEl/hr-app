import { redirect } from 'next/navigation';
import { getSessionUser, ROLE_LABEL } from '@/app/_lib/authz';
import { buildBottomNav, buildDrawerNav, buildNav } from '@/components/shell/nav';
import { Shell } from '@/components/shell/shell';

// App shell: semua halaman di dalam group ini butuh session (§7 route group).
// force-dynamic: getCurrentSession() bisa return tanpa cookies() (mock/placeholder)
// sehingga Next berprilaku statis & mem-bake redirect /login ke production.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <Shell
      user={user}
      roleLabel={ROLE_LABEL[user.role]}
      nav={buildNav(user.role)}
      bottomNav={buildBottomNav(user.role)}
      drawerNav={buildDrawerNav(user.role)}
    >
      {children}
    </Shell>
  );
}
