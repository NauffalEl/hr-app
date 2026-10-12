import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

/** Empty state: ikon + judul + satu kalimat + aksi (§3.9). */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className = '',
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      <Icon name={icon} className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
