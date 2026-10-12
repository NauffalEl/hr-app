'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { changeEmployee, saveEmployee } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { ContractType, FormState } from '@/app/_lib/types';
import { Button } from '@/components/ui/button';
import { Field, inputCls, selectCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';

type Option = { id: string; nama: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTRACTS: { value: ContractType; label: string }[] = [
  { value: 'PKWT', label: 'PKWT' },
  { value: 'PKWTT', label: 'PKWTT' },
  { value: 'MAGANG', label: 'Magang' },
];

export type EmployeeFormProps = {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    nik: string;
    nama: string;
    email: string;
    jabatan: string;
    departemen: string;
    tanggalMasuk: string;
    statusKontrak: ContractType;
    atasanId: string | null;
  };
  atasanOptions: Option[];
  departemenOptions: string[];
};

/** Form tambah/ubah karyawan: loading, fieldErrors per-field, sukses → toast + pindah. */
export function EmployeeForm({ mode, id, initial, atasanOptions, departemenOptions }: EmployeeFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const atasanId = String(v.atasanId ?? '');
    const fieldErrors: Record<string, string> = {};
    if (!v.nik) fieldErrors.nik = 'NIK wajib diisi.';
    else if (String(v.nik).length > 32) fieldErrors.nik = 'NIK maksimal 32 karakter.';
    if (!v.nama) fieldErrors.nama = 'Nama wajib diisi.';
    if (!v.email) fieldErrors.email = 'Email wajib diisi.';
    else if (!EMAIL_RE.test(String(v.email))) fieldErrors.email = 'Format email tidak valid.';
    if (!v.jabatan) fieldErrors.jabatan = 'Jabatan wajib diisi.';
    if (!v.departemen) fieldErrors.departemen = 'Departemen wajib diisi.';
    if (!v.tanggalMasuk) fieldErrors.tanggalMasuk = 'Tanggal masuk wajib diisi.';
    if (mode === 'edit' && atasanId && atasanId === id) fieldErrors.atasanId = 'Atasan tidak boleh diri sendiri.';
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    const input = {
      nik: String(v.nik),
      nama: String(v.nama),
      email: String(v.email),
      jabatan: String(v.jabatan),
      departemen: String(v.departemen),
      tanggalMasuk: String(v.tanggalMasuk),
      statusKontrak: String(v.statusKontrak),
      atasanId,
    };

    const res = mode === 'create' ? await saveEmployee(input) : await changeEmployee({ id, ...input });
    const mapped = fromAction(res, ['nik', 'email', 'nama', 'jabatan', 'departemen', 'tanggalMasuk', 'statusKontrak', 'atasanId']);
    if (mapped?.ok) {
      toast.success(mode === 'create' ? 'Karyawan ditambahkan.' : 'Perubahan disimpan.');
      const createdId = (res.ok && res.data && (res.data as { id?: string }).id) || id;
      router.push(createdId ? `/karyawan/${createdId}` : '/karyawan');
      router.refresh();
    }
    return mapped;
  }

  const fe = state?.fieldErrors;

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state && !state.ok && state.message && !fe && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="nik" label="NIK" required error={fe?.nik}>
          {(ctl) => <input {...ctl} name="nik" defaultValue={initial?.nik} maxLength={32} placeholder="1234567890" className={inputCls(fe?.nik)} />}
        </Field>
        <Field id="nama" label="Nama lengkap" required error={fe?.nama}>
          {(ctl) => <input {...ctl} name="nama" defaultValue={initial?.nama} placeholder="Budi Santoso" className={inputCls(fe?.nama)} />}
        </Field>
        <Field id="email" label="Email" required error={fe?.email}>
          {(ctl) => (
            <input {...ctl} type="email" name="email" defaultValue={initial?.email} placeholder="nama@perusahaan.com" className={inputCls(fe?.email)} />
          )}
        </Field>
        <Field id="jabatan" label="Jabatan" required error={fe?.jabatan}>
          {(ctl) => <input {...ctl} name="jabatan" defaultValue={initial?.jabatan} placeholder="Software Engineer" className={inputCls(fe?.jabatan)} />}
        </Field>
        <Field
          id="departemen"
          label="Departemen"
          required
          error={fe?.departemen}
          helper="Pilih yang ada atau ketik nama departemen baru."
        >
          {(ctl) => (
            <input
              {...ctl}
              name="departemen"
              list="daftar-departemen"
              defaultValue={initial?.departemen}
              placeholder="Engineering"
              className={inputCls(fe?.departemen)}
            />
          )}
        </Field>
        <datalist id="daftar-departemen">
          {departemenOptions.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <Field id="tanggalMasuk" label="Tanggal masuk" required error={fe?.tanggalMasuk}>
          {(ctl) => <input {...ctl} type="date" name="tanggalMasuk" defaultValue={initial?.tanggalMasuk} className={inputCls(fe?.tanggalMasuk)} />}
        </Field>
        <Field id="statusKontrak" label="Jenis kontrak" required error={fe?.statusKontrak}>
          {(ctl) => (
            <select {...ctl} name="statusKontrak" defaultValue={initial?.statusKontrak ?? 'PKWT'} className={selectCls(fe?.statusKontrak)}>
              {CONTRACTS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="atasanId" label="Atasan" error={fe?.atasanId} helper="Opsional — dipakai untuk approval cuti.">
          {(ctl) => (
            <select {...ctl} name="atasanId" defaultValue={initial?.atasanId ?? ''} className={selectCls(fe?.atasanId)}>
              <option value="">— Tidak ada atasan —</option>
              {atasanOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {/* Submit bar: menempel di atas bottom nav mobile (§3.8) */}
      <div className="sticky bottom-16 z-20 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <Button variant="secondary" size="lg" onClick={() => router.back()} className="sm:w-auto">
          Batal
        </Button>
        <Button type="submit" size="lg" loading={pending} loadingLabel="Menyimpan…" className="sm:w-auto">
          <Icon name="check" className="h-4 w-4" />
          {mode === 'create' ? 'Simpan Karyawan' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
