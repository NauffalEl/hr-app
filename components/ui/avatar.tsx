const sizes: Record<number, string> = {
  28: 'h-7 w-7 text-[11px]',
  32: 'h-8 w-8 text-xs',
  40: 'h-10 w-10 text-sm',
  56: 'h-14 w-14 text-lg',
};

/** Avatar inisial — bg netral, deterministik dari nama (§3.9). */
export function Avatar({ nama, size = 32, className = '' }: { nama: string; size?: 28 | 32 | 40 | 56; className?: string }) {
  const inisial = nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600 ${sizes[size]} ${className}`}
    >
      {inisial || '?'}
    </span>
  );
}
