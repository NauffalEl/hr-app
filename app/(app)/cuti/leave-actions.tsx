'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveLeave, cancelLeave, rejectLeave } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { FormState, LeaveRow } from '@/app/_lib/types';
import { Button, IconButton } from '@/components/ui/button';
import { Field, textareaCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Action = 'approve' | 'reject' | 'cancel';

/** Aksi pengajuan cuti: Setujui/Tolak (catatan wajib saat Tolak) + Batalkan. */
export function LeaveActions({ leave, mode }: { leave: LeaveRow; mode: 'approval' | 'mine' }) {
  const [action, setAction] = useState<Action | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const router = useRouter();
  const toast = useToast();
  const open = action !== null;

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const catatan = String(v.catatan ?? '');
    if (action === 'reject' && !catatan.trim()) {
      return { ok: false, fieldErrors: { catatan: 'Catatan wajib diisi untuk penolakan.' } };
    }
    let res;
    if (action === 'approve') res = await approveLeave({ id: leave.id, catatan });
    else if (action === 'reject') res = await rejectLeave({ id: leave.id, catatan });
    else res = await cancelLeave({ id: leave.id });

    const mapped = fromAction(res, ['catatan']);
    if (mapped?.ok) {
      toast.success(
        action === 'approve'
          ? 'Pengajuan disetujui. Notifikasi terkirim.'
          : action === 'reject'
            ? 'Pengajuan ditolak. Notifikasi terkirim.'
            : 'Pengajuan dibatalkan.'
      );
      setAction(null);
      router.refresh();
    }
    return mapped;
  }

  const fe = state?.fieldErrors;
  const title =
    action === 'approve'
      ? `Setujui cuti ${leave.employee.nama}?`
      : action === 'reject'
        ? `Tolak cuti ${leave.employee.nama}?`
        : 'Batalkan pengajuan ini?';

  return (
    <>
      {mode === 'approval' ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="md" onClick={() => setAction('approve')} className="sm:flex-1">
            <Icon name="check" className="h-4 w-4" />
            Setujui
          </Button>
          <Button variant="dangerOutline" size="md" onClick={() => setAction('reject')} className="sm:flex-1">
            <Icon name="close" className="h-4 w-4" />
            Tolak
          </Button>
        </div>
      ) : (
        <IconButton label="Batalkan pengajuan" onClick={() => setAction('cancel')}>
          <Icon name="trash" className="h-4 w-4" />
        </IconButton>
      )}

      <Modal
        open={open}
        onClose={() => setAction(null)}
        title={title}
        description={
          action === 'cancel'
            ? 'Pengajuan yang dibatalkan tidak bisa dipulihkan.'
            : 'Email notifikasi dikirim ke pemohon dan approver.'
        }
        labelledBy="aksi-cuti-title"
      >
        <form action={formAction} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            {leave.jenis === 'TAHUNAN' ? 'Tahunan' : leave.jenis === 'SAKIT' ? 'Sakit' : 'Izin'} ·{' '}
            <span className="num">{leave.tanggalMulai}</span> → <span className="num">{leave.tanggalAkhir}</span>
          </p>
          {action !== 'cancel' && (
            <Field
              id="catatan"
              label={`Catatan approver${action === 'reject' ? '' : ' (opsional)'}`}
              required={action === 'reject'}
              error={fe?.catatan}
            >
              {(ctl) => (
                <textarea {...ctl} name="catatan" rows={3} placeholder={action === 'reject' ? 'Alasan penolakan' : 'Catatan untuk pemohon'} className={textareaCls(fe?.catatan)} />
              )}
            </Field>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="lg" onClick={() => setAction(null)}>
              Kembali
            </Button>
            <Button
              type="submit"
              variant={action === 'reject' ? 'danger' : 'primary'}
              size="lg"
              loading={pending}
              loadingLabel="Menyimpan…"
            >
              {action === 'approve' ? 'Setujui' : action === 'reject' ? 'Tolak' : 'Batalkan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
