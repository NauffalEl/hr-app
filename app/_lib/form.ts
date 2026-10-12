import type { ActionResult, FieldErrors, FormState } from './types';

// Semua form client pakai pola ini: state = FormState, action = (formData) => FormState.

/** FormData -> object input action (field kosong = ''). */
export function fd(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  fd.forEach((v, k) => {
    out[k] = typeof v === 'string' ? v.trim() : v;
  });
  return out;
}

/**
 * Petakan error server ke field. Action Dimas melempar ActionError ber-pesan
 * tunggal ('nik tidak valid', 'NIK atau email sudah dipakai') — cocokkan dengan
 * daftar field form, sisanya jadi message umum.
 */
export function fromAction<T>(res: ActionResult<T>, fields: string[] = []): FormState {
  if (res.ok) return { ok: true, data: res.data };
  const msg = res.error || 'Terjadi kesalahan. Coba lagi.';
  const lower = msg.toLowerCase();
  const hit =
    fields.find((f) => lower.startsWith(f.toLowerCase())) ??
    fields.find((f) => f.length > 3 && lower.includes(f.toLowerCase()));
  if (hit) {
    const fieldErrors: FieldErrors = { [hit]: cap(msg) };
    return { ok: false, message: msg, fieldErrors };
  }
  return { ok: false, message: msg };
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Validasi ringan sebelum kirim (menghindari round-trip untuk error jelas). */
export function req(values: Record<string, string | undefined>, labels: Record<string, string>): FieldErrors | undefined {
  const errs: FieldErrors = {};
  for (const [k, label] of Object.entries(labels)) {
    if (!values[k]) errs[k] = `${label} wajib diisi.`;
  }
  return Object.keys(errs).length ? errs : undefined;
}
