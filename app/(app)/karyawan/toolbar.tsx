'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';

type Filters = { q: string; departemen: string; statusKontrak: string };

/** Toolbar cari + filter: debounce 300ms, update URL query (shareable) — §4 /karyawan. */
export function KaryawanToolbar({
  initial,
  departemenOptions,
}: {
  initial: Filters;
  departemenOptions: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [departemen, setDepartemen] = useState(initial.departemen);
  const [statusKontrak, setStatusKontrak] = useState(initial.statusKontrak);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(initial.q);
    setDepartemen(initial.departemen);
    setStatusKontrak(initial.statusKontrak);
  }, [initial.q, initial.departemen, initial.statusKontrak]);

  const push = (next: Partial<Filters>) => {
    const merged = { q, departemen, statusKontrak, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set('q', merged.q);
    if (merged.departemen) params.set('departemen', merged.departemen);
    if (merged.statusKontrak) params.set('statusKontrak', merged.statusKontrak);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/karyawan?${qs}` : '/karyawan'));
  };

  const onSearch = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: value }), 300);
  };

  const reset = () => {
    setQ('');
    setDepartemen('');
    setStatusKontrak('');
    if (timer.current) clearTimeout(timer.current);
    startTransition(() => router.push('/karyawan'));
  };

  const inputCls =
    'h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="mb-4 space-y-2">
      <div className="relative">
        <label htmlFor="cari-karyawan" className="sr-only">
          Cari karyawan
        </label>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="cari-karyawan"
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Cari nama, NIK, atau email…"
          className={`${inputCls} pl-9`}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="filter-departemen" className="sr-only">
            Filter departemen
          </label>
          <select
            id="filter-departemen"
            value={departemen}
            onChange={(e) => {
              setDepartemen(e.target.value);
              push({ departemen: e.target.value });
            }}
            className={inputCls}
          >
            <option value="">Semua departemen</option>
            {departemenOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="sr-only">
            Filter status kontrak
          </label>
          <select
            id="filter-status"
            value={statusKontrak}
            onChange={(e) => {
              setStatusKontrak(e.target.value);
              push({ statusKontrak: e.target.value });
            }}
            className={inputCls}
          >
            <option value="">Semua status</option>
            <option value="PKWT">PKWT</option>
            <option value="PKWTT">PKWTT</option>
            <option value="MAGANG">Magang</option>
          </select>
        </div>
      </div>
      {(q || departemen || statusKontrak) && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
          Reset filter
        </button>
      )}
    </div>
  );
}
