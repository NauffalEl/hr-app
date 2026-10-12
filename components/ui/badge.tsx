import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'info' // sky
  | 'success' // emerald
  | 'warning' // amber
  | 'danger' // red kecil
  | 'dangerStrong' // merah pekat (≤7 hari, penekanan kuat)
  | 'neutral';

const cls: Record<BadgeVariant, string> = {
  info: 'bg-sky-50 text-sky-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  dangerStrong: 'bg-red-600 text-white',
  neutral: 'bg-slate-100 text-slate-600',
};

/** Badge status: selalu ada teks (bukan warna saja) — §6. */
export function Badge({
  variant = 'neutral',
  dot = false,
  children,
  className = '',
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}

// Label status (konsisten dengan PRD/design §3.5)
export const CONTRACT_LABEL: Record<string, string> = {
  PKWT: 'PKWT',
  PKWTT: 'PKWTT',
  MAGANG: 'Magang',
};

export const LEAVE_LABEL: Record<string, string> = {
  TAHUNAN: 'Tahunan',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
};

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

export function leaveStatusBadge(status: string): { variant: BadgeVariant; label: string } {
  switch (status) {
    case 'APPROVED':
      return { variant: 'success', label: LEAVE_STATUS_LABEL.APPROVED };
    case 'REJECTED':
      return { variant: 'danger', label: LEAVE_STATUS_LABEL.REJECTED };
    case 'CANCELLED':
      return { variant: 'neutral', label: LEAVE_STATUS_LABEL.CANCELLED };
    default:
      return { variant: 'warning', label: 'Diajukan' };
  }
}

/** Sisa hari kontrak: ≤7 dangerStrong, ≤30 warning, >30 neutral. */
export function contractSisaBadge(sisaHari: number | null): { variant: BadgeVariant; label: string } {
  if (sisaHari === null) return { variant: 'neutral', label: 'Tanpa akhir' };
  if (sisaHari <= 7) return { variant: 'dangerStrong', label: `${sisaHari} hari` };
  if (sisaHari <= 30) return { variant: 'warning', label: `${sisaHari} hari` };
  return { variant: 'neutral', label: `${sisaHari} hari` };
}
