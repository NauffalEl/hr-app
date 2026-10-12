import type { ReactNode } from 'react';
import { Icon } from './icon';

export type FieldControl = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/**
 * Field form: label 13px + kontrol + error/helper. Kontrol menerima id &
 * aria-describedby sehingga error selalu terhubung (WCAG §6).
 */
export function Field({
  id,
  label,
  required,
  error,
  helper,
  children,
  className = '',
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helper?: ReactNode;
  children: (ctl: FieldControl) => ReactNode;
  className?: string;
}) {
  const helperId = helper ? `${id}-help` : undefined;
  const errorId = error ? `${id}-err` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
          <Icon name="alertCircle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && helper && (
        <p id={helperId} className="mt-1.5 text-xs text-slate-500">
          {helper}
        </p>
      )}
    </div>
  );
}

const base =
  'w-full rounded-md border px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500';

export const inputCls = (error?: string) =>
  `${base} h-10 ${error ? 'border-red-300' : 'border-slate-200'}`;

export const selectCls = (error?: string) =>
  `${base} h-10 bg-white ${error ? 'border-red-300' : 'border-slate-200'}`;

export const textareaCls = (error?: string) =>
  `${base} min-h-24 py-2 leading-relaxed ${error ? 'border-red-300' : 'border-slate-200'}`;
