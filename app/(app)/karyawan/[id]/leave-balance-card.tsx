'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveLeaveBalance } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { FormState, SaldoCuti } from '@/app/_lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, inputCls } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';

const THIS_YEAR = new Date().getUTCFullYear();

/** Badge sisa: emerald bila masih lega, amber bila menipis (≤2 hari). */
function SisaBadge({ sisa }: { sisa: number }) {
  return <Badge variant={sisa <= 2 ? 'warning' : 'success'}>{sisa} hari</Badge>;
}

/**
 * Kartu 'Saldo Cuti Tahunan' — HR_ADMIN only (dirender kondisional di page).
 * Input tahun + saldoAwal → setLeaveBalance (upsert); null = 'Belum diatur HR'.
 */
export function LeaveBalanceCard({
  employeeId,
  balances,
}: {
  employeeId: string;
  balances: SaldoCuti[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tahun, setTahun] = useState(THIS_YEAR);
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);

  const balance = balances.find((b) => b.tahun === tahun) ?? null;

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const year = Number(v.tahun);
    const saldoAwal = Number(v.saldoAwal);
    const fieldErrors: Record<string, string> = {};
    if (!Number.isInteger(year) || year < 2000 || year > 2100) fieldErrors.tahun = 'Tahun harus 2000–2100.';
    if (!Number.isInteger(saldoAwal) || saldoAwal < 0 || saldoAwal > 366) fieldErrors.saldoAwal = 'Saldo harus 0–366 hari.';
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    const res = await saveLeaveBalance({ employeeId, tahun: year, saldoAwal });
    const mapped = fromAction(res, ['saldoAwal', 'tahun']);
    if (mapped?.ok) {
      toast.success(`Saldo cuti ${year} disimpan.`);
      router.refresh();
    }
    return mapped;
  }

  const fe = state?.fieldErrors;
  const sorted = [...balances].sort((a, b) => b.tahun - a.tahun);

  return (
    <section aria-labelledby="saldo-cuti-title" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 lg:px-5">
        <h2 id="saldo-cuti-title" className="text-base font-semibold text-slate-900">
          Saldo Cuti Tahunan
        </h2>
        <p className="text-xs text-slate-500">HR saja yang boleh mengatur saldo.</p>
      </div>

      <div className="space-y-4 p-4 lg:p-5">
        {/* Status tahun terpilih */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
          <p className="text-[13px] text-slate-600">
            Saldo <span className="num font-semibold text-slate-900">{tahun}</span>:
          </p>
          {balance ? (
            <span className="flex items-center gap-2">
              <span className="num text-[13px] text-slate-500">
                awal {balance.saldoAwal} · terpakai {balance.terpakai}
              </span>
              <SisaBadge sisa={balance.sisa} />
            </span>
          ) : (
            <span className="text-[13px] font-medium text-slate-500">Belum diatur HR</span>
          )}
        </div>

        <form action={formAction} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field id="tahun" label="Tahun" required error={fe?.tahun}>
            {(ctl) => (
              <input
                {...ctl}
                type="number"
                name="tahun"
                min={2000}
                max={2100}
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value) || THIS_YEAR)}
                className={`${inputCls(fe?.tahun)} num`}
              />
            )}
          </Field>
          <Field
            id="saldoAwal"
            label="Saldo awal (hari)"
            required
            error={fe?.saldoAwal}
            helper={balance ? `Terpakai ${balance.terpakai} hari.` : 'Tahun ini belum ada saldo.'}
          >
            {(ctl) => (
              <input
                {...ctl}
                type="number"
                name="saldoAwal"
                min={0}
                max={366}
                defaultValue={balance?.saldoAwal ?? ''}
                placeholder="12"
                className={`${inputCls(fe?.saldoAwal)} num`}
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" size="md" loading={pending} loadingLabel="Menyimpan…">
              Simpan
            </Button>
          </div>
        </form>

        {/* Riwayat saldo per tahun */}
        {sorted.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13px] font-medium text-slate-700">Riwayat saldo</h3>
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-100">
              {sorted.map((b) => (
                <li key={b.tahun} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
                  <span className="num text-slate-700">{b.tahun}</span>
                  <span className="num text-slate-500">
                    awal {b.saldoAwal} · terpakai {b.terpakai}
                  </span>
                  <SisaBadge sisa={b.sisa} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
