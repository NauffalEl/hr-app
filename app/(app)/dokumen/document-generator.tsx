'use client';

import { useActionState, useState } from 'react';
import { makeDocument } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { FormState } from '@/app/_lib/types';
import { Button } from '@/components/ui/button';
import { Field, inputCls, selectCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';

type DocType = 'kontrak' | 'keterangan' | 'cuti';

const DOC_LABEL: Record<DocType, string> = {
  kontrak: 'Surat Kontrak Kerja',
  keterangan: 'Surat Keterangan Kerja',
  cuti: 'Surat Cuti',
};

export function DocumentGenerator({
  type,
  employees,
  defaultEmployeeId,
  canPickEmployee,
}: {
  type: DocType;
  employees: { id: string; nama: string }[];
  defaultEmployeeId: string;
  canPickEmployee: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const [result, setResult] = useState<{ base64: string; filename: string } | null>(null);
  const toast = useToast();

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const employeeId = String(v.employeeId ?? defaultEmployeeId);
    if (!employeeId) return { ok: false, message: 'Pilih karyawan terlebih dahulu.' };

    const res = await makeDocument({ type, employeeId });
    const mapped = fromAction(res, ['employeeId', 'type']);
    if (mapped?.ok) {
      const data = res.ok ? res.data : null;
      if (data) {
        setResult(data);
        toast.success(`PDF ${DOC_LABEL[type]} siap diunduh.`);
      }
    }
    return mapped;
  }

  const fe = state?.fieldErrors;
  const dataUrl = result ? `data:application/pdf;base64,${result.base64}` : null;

  const print = () => {
    if (!dataUrl) return;
    const w = window.open(dataUrl, '_blank');
    w?.focus();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
      <form action={formAction} noValidate className="space-y-4">
        {state && !state.ok && state.message && !fe && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {state.message}
          </div>
        )}

        <Field
          id="employeeId"
          label="Karyawan"
          required
          error={fe?.employeeId}
          helper={canPickEmployee ? undefined : 'Surat dibuat untuk data Anda sendiri.'}
        >
          {(ctl) =>
            canPickEmployee ? (
              <select {...ctl} name="employeeId" defaultValue={defaultEmployeeId} className={selectCls(fe?.employeeId)}>
                <option value="">— Pilih karyawan —</option>
                {employees.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </select>
            ) : (
              <input {...ctl} name="employeeId" value={defaultEmployeeId} readOnly className={`${inputCls(fe?.employeeId)} bg-slate-50`} />
            )
          }
        </Field>

        <Button type="submit" size="lg" loading={pending} loadingLabel="Membuat PDF…">
          <Icon name="fileText" className="h-4 w-4" />
          Buat {DOC_LABEL[type]}
        </Button>
      </form>
      </div>

      {/* Panel preview */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Preview</p>
          <div className="flex gap-2">
            <a
              href={dataUrl ?? '#'}
              download={result?.filename}
              aria-disabled={!dataUrl}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-semibold ${
                dataUrl
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400 pointer-events-none'
              }`}
            >
              <Icon name="download" className="h-4 w-4" />
              Unduh PDF
            </a>
            <Button variant="secondary" size="sm" onClick={print} disabled={!dataUrl}>
              <Icon name="printer" className="h-4 w-4" />
              Cetak
            </Button>
          </div>
        </div>
        {dataUrl ? (
          <iframe
            src={dataUrl}
            title={`Preview ${DOC_LABEL[type]}`}
            className="aspect-[1/1.414] w-full rounded-md border border-slate-200 bg-slate-100"
          />
        ) : (
          <div className="flex aspect-[1/1.414] w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
            <Icon name="fileText" className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-900">Belum ada preview</p>
            <p className="text-[13px] text-slate-500">Buat surat untuk melihat preview PDF.</p>
          </div>
        )}
      </div>
    </div>
  );
}
