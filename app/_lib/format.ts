/** Format tanggal aman untuk string ISO (YYYY-MM-DD) atau Date (serialisasi RSC). */
export function tgl(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('id-ID', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function jam(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
