'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addContract } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { ContractType, FormState } from '@/app/_lib/types';
import { Button, IconButton } from '@/components/ui/button';
import { Field, inputCls, selectCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Option = { id: string; nama: string };

/**
 * Perpanjang kontrak = INSERT periode baru (§7 Bima #2).
 * Dipakai dari header (pilih karyawan) dan dari baris (karyawan terkunci).
 */
export function ExtendContractModal({
  employees,
  contract,
  withLabel = false,
}: {
  employees: Option[];
  contract?: { id: string; employeeId: string; nama: string; jenis: ContractType };
  withLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const router = useRouter();
  const toast = useToast();
  const [jenis, setJenis] = useState<ContractType>(contract?.jenis ?? 'PKWT');

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const employeeId = String(v.employeeId ?? '');
    const fieldErrors: Record<string, string> = {};
    if (!employeeId) fieldErrors.employeeId = 'Pilih karyawan.';
    if (!v.tanggalMulai) fieldErrors.tanggalMulai = 'Tanggal mulai wajib diisi.';
    if (String(v.jenis) !== 'PKWTT' && !v.tanggalAkhir) fieldErrors.tanggalAkhir = 'Tanggal selesai wajib diisi.';
    if (
      v.tanggalMulai &&
      v.tanggalAkhir &&
      String(v.tanggalAkhir) <= String(v.tanggalMulai)
    ) {
      fieldErrors.tanggalAkhir = 'Tanggal selesai harus setelah tanggal mulai.';
    }
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    const res = await addContract({
      employeeId,
      jenis: String(v.jenis),
      tanggalMulai: String(v.tanggalMulai),
      tanggalAkhir: String(v.tanggalAkhir ?? ''),
    });
    const mapped = fromAction(res, ['tanggalAkhir', 'tanggalMulai', 'employeeId', 'jenis']);
    if (mapped?.ok) {
      toast.success('Kontrak baru tersimpan. Milestone reminder dihitung ulang.');
      setOpen(false);
      router.refresh();
    }
    return mapped;
  }

  const fe = state?.fieldErrors;
  const title = contract ? `Perpanjang kontrak ${contract.nama}` : 'Perpanjang kontrak';

  return (
    <>
      {withLabel ? (
        <Button size="md" onClick={() => setOpen(true)}>
          <Icon name="plus" className="h-4 w-4" />
          Perpanjang Kontrak
        </Button>
      ) : (
        <IconButton
          label={`Perpanjang kontrak ${contract?.nama ?? ''}`}
          onClick={() => setOpen(true)}
          className="relative z-10"
        >
          <Icon name="refresh" className="h-4 w-4" />
        </IconButton>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description="Perpanjangan membuat periode kontrak baru (reminder H-30/H-14/H-7 dihitung ulang)."
        labelledBy="perpanjang-kontrak-title"
      >
        <form action={formAction} noValidate className="space-y-4">
          {state && !state.ok && state.message && !fe && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {state.message}
            </div>
          )}
          {!contract && (
            <Field id="employeeId" label="Karyawan" required error={fe?.employeeId}>
              {(ctl) => (
                <select {...ctl} name="employeeId" defaultValue="" className={selectCls(fe?.employeeId)}>
                  <option value="">— Pilih karyawan —</option>
                  {employees.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nama}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          {contract && <input type="hidden" name="employeeId" value={contract.employeeId} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="jenis" label="Jenis kontrak" required error={fe?.jenis}>
              {(ctl) => (
                <select
                  {...ctl}
                  name="jenis"
                  defaultValue={contract?.jenis ?? 'PKWT'}
                  onChange={(e) => setJenis(e.target.value as ContractType)}
                  className={selectCls(fe?.jenis)}
                >
                  <option value="PKWT">PKWT</option>
                  <option value="PKWTT">PKWTT</option>
                  <option value="MAGANG">Magang</option>
                </select>
              )}
            </Field>
            <Field id="tanggalMulai" label="Tanggal mulai" required error={fe?.tanggalMulai}>
              {(ctl) => <input {...ctl} type="date" name="tanggalMulai" className={inputCls(fe?.tanggalMulai)} />}
            </Field>
          </div>
          {jenis !== 'PKWTT' && (
            <Field id="tanggalAkhir" label="Tanggal selesai" required error={fe?.tanggalAkhir}>
              {(ctl) => <input {...ctl} type="date" name="tanggalAkhir" className={inputCls(fe?.tanggalAkhir)} />}
            </Field>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="lg" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" size="lg" loading={pending} loadingLabel="Menyimpan…">
              Simpan Perpanjangan
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
