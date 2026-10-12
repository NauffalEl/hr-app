'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendLeave } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { FormState, LeaveType, SaldoCuti } from '@/app/_lib/types';
import { Button } from '@/components/ui/button';
import { Field, inputCls, selectCls, textareaCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';

const JENIS: { value: LeaveType; label: string }[] = [
  { value: 'TAHUNAN', label: 'Tahunan' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'IZIN', label: 'Izin' },
];

// Pratinjau durasi (Sabtu/Minggu libur) — validasi final server pakai hitungHariKerja.
function hariKerja(mulai: string, akhir: string): number {
  if (!mulai || !akhir) return 0;
  const start = new Date(`${mulai}T00:00:00Z`);
  const end = new Date(`${akhir}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/**
 * Form Ajukan Cuti: info saldo (null = 'Belum diatur HR'), pratinjau hari kerja,
 * blok merah + submit disabled bila melebihi saldo (hanya jenis Tahunan).
 */
export function LeaveForm({ saldo, tahun }: { saldo: SaldoCuti | null; tahun: number }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const [jenis, setJenis] = useState<LeaveType>('TAHUNAN');
  const [mulai, setMulai] = useState('');
  const [akhir, setAkhir] = useState('');
  const router = useRouter();
  const toast = useToast();

  const durasi = hariKerja(mulai, akhir);
  const melebihi = jenis === 'TAHUNAN' && saldo !== null && durasi > saldo.sisa;
  const saldoKurang = jenis === 'TAHUNAN' && saldo === null;
  const canSubmit = !melebihi;

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const fieldErrors: Record<string, string> = {};
    if (!v.jenis) fieldErrors.jenis = 'Jenis cuti wajib dipilih.';
    if (!v.tanggalMulai) fieldErrors.tanggalMulai = 'Tanggal mulai wajib diisi.';
    if (!v.tanggalAkhir) fieldErrors.tanggalAkhir = 'Tanggal selesai wajib diisi.';
    else if (v.tanggalMulai && String(v.tanggalAkhir) < String(v.tanggalMulai))
      fieldErrors.tanggalAkhir = 'Tanggal selesai sebelum tanggal mulai.';
    if (!v.alasan) fieldErrors.alasan = 'Alasan wajib diisi.';
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    const res = await sendLeave({
      jenis: String(v.jenis),
      tanggalMulai: String(v.tanggalMulai),
      tanggalAkhir: String(v.tanggalAkhir),
      alasan: String(v.alasan),
    });
    const mapped = fromAction(res, ['jenis', 'tanggalMulai', 'tanggalAkhir', 'alasan', 'saldo']);
    if (mapped?.ok) {
      toast.success('Pengajuan terkirim. Menunggu persetujuan Manager.');
      router.push('/cuti?tab=saya');
      router.refresh();
    }
    return mapped;
  }

  const fe = state?.fieldErrors;
  const infoSaldo = useMemo(() => {
    if (jenis !== 'TAHUNAN') {
      return { tone: 'info', text: `${JENIS.find((j) => j.value === jenis)?.label} tidak memotong saldo cuti tahunan.` };
    }
    if (!saldo) return { tone: 'warn', text: 'Belum diatur HR — hubungi HR Admin untuk mengatur saldo cuti tahunan.' };
    return {
      tone: 'info',
      text: `Saldo ${saldo.tahun}: awal ${saldo.saldoAwal} · terpakai ${saldo.terpakai} · sisa ${saldo.sisa} hari.`,
    };
  }, [jenis, saldo]);

  return (
    <div className="max-w-xl">
      <form action={formAction} noValidate className="space-y-4">
        {state && !state.ok && state.message && !fe && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {state.message}
          </div>
        )}

        {/* Info saldo */}
        <div
          className={`rounded-md border p-3 text-[13px] ${
            infoSaldo.tone === 'warn' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-slate-700'
          }`}
        >
          <p className="font-medium">{infoSaldo.tone === 'warn' ? 'Saldo belum tersedia' : 'Saldo cuti tahunan'}</p>
          <p className="mt-0.5">{infoSaldo.text}</p>
        </div>

        <Field id="jenis" label="Jenis cuti" required error={fe?.jenis}>
          {(ctl) => (
            <select
              {...ctl}
              name="jenis"
              value={jenis}
              onChange={(e) => setJenis(e.target.value as LeaveType)}
              className={selectCls(fe?.jenis)}
            >
              {JENIS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="tanggalMulai" label="Tanggal mulai" required error={fe?.tanggalMulai}>
            {(ctl) => (
              <input {...ctl} type="date" name="tanggalMulai" value={mulai} onChange={(e) => setMulai(e.target.value)} className={inputCls(fe?.tanggalMulai)} />
            )}
          </Field>
          <Field id="tanggalAkhir" label="Tanggal selesai" required error={fe?.tanggalAkhir}>
            {(ctl) => (
              <input {...ctl} type="date" name="tanggalAkhir" value={akhir} onChange={(e) => setAkhir(e.target.value)} className={inputCls(fe?.tanggalAkhir)} />
            )}
          </Field>
        </div>

        {durasi > 0 && (
          <p className="text-[13px] text-slate-500">
            Durasi: <span className="num font-medium text-slate-900">{durasi} hari kerja</span>
            {melebihi && <span className="text-red-600"> — melebihi sisa saldo ({saldo?.sisa} hari).</span>}
          </p>
        )}

        {melebihi && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            Pengajuan melebihi saldo. Kurangi durasi atau pilih jenis lain.
          </div>
        )}
        {saldoKurang && jenis === 'TAHUNAN' && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            Saldo cuti tahunan belum diatur HR — pengajuan tahunan belum bisa diproses.
          </div>
        )}

        <Field id="alasan" label="Alasan" required error={fe?.alasan}>
          {(ctl) => <textarea {...ctl} name="alasan" rows={4} placeholder="Contoh: keperluan keluarga" className={textareaCls(fe?.alasan)} />}
        </Field>

        <Button type="submit" size="lg" loading={pending} loadingLabel="Mengirim…" disabled={!canSubmit} className="w-full sm:w-auto">
          <Icon name="check" className="h-4 w-4" />
          Ajukan Cuti
        </Button>
      </form>
    </div>
  );
}
