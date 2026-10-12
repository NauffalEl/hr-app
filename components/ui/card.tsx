import type { ReactNode } from 'react';

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  action,
  className = '',
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 lg:px-5 ${className}`}
    >
      <h2 className="text-base font-semibold leading-tight text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`p-4 lg:p-5 ${className}`}>{children}</div>;
}
