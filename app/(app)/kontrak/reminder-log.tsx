'use client';

import { useEffect, useState } from 'react';
import type { ReminderLogRow } from '@/app/_lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { jam, tgl } from '@/app/_lib/format';

/** Log reminder H-30/H-14/H-7: tabel (desktop) / collapsible (mobile). */
export function ReminderLog({ items }: { items: ReminderLogRow[] }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(window.matchMedia('(min-width: 1024px)').matches);
  }, []);

  return (
    <Card>
      <CardHeader
        title="Log Reminder"
        action={
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="log-reminder-body"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Icon name={open ? 'chevronDown' : 'chevronRight'} className="h-4 w-4" />
            <span className="sr-only">{open ? 'Tutup log reminder' : 'Buka log reminder'}</span>
          </button>
        }
      />
      <div id="log-reminder-body" className={open ? 'block' : 'hidden'}>
        {items.length === 0 ? (
          <EmptyState
            icon="mail"
            title="Belum ada reminder terkirim"
            description="Email H-30, H-14, dan H-7 akan tercatat di sini."
          />
        ) : (
          <>
            {/* Tabel desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Karyawan</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Penerima</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Milestone</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="num h-11 px-4 text-slate-700">{jam(r.createdAt)}</td>
                      <td className="h-11 px-4 font-medium text-slate-900">{r.contract.employee.nama}</td>
                      <td className="h-11 px-4 text-slate-700">{r.kirimKe}</td>
                      <td className="h-11 px-4">
                        <Badge variant={r.milestone === 'H7' ? 'danger' : r.milestone === 'H14' ? 'warning' : 'neutral'}>
                          {r.milestone === 'H30' ? 'H-30' : r.milestone === 'H14' ? 'H-14' : 'H-7'}
                        </Badge>
                      </td>
                      <td className="h-11 px-4">
                        <Badge variant={r.status === 'SENT' ? 'success' : 'danger'}>
                          {r.status === 'SENT' ? 'Terkirim' : 'Gagal'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card list mobile */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {items.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{r.contract.employee.nama}</span>
                    <Badge variant={r.status === 'SENT' ? 'success' : 'danger'}>
                      {r.status === 'SENT' ? 'Terkirim' : 'Gagal'}
                    </Badge>
                  </div>
                  <p className="num mt-0.5 text-[13px] text-slate-500">
                    {tgl(r.createdAt)} · {r.milestone === 'H30' ? 'H-30' : r.milestone === 'H14' ? 'H-14' : 'H-7'} · {r.kirimKe}
                  </p>
                  {r.error && <p className="mt-0.5 text-[13px] text-red-600">{r.error}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
