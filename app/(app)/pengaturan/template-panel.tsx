'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetEmailTemplate, saveDocumentTemplate, saveEmailTemplate } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { EmailTemplateRow, FormState } from '@/app/_lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, inputCls, textareaCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Item = { key: string; label: string; kind: 'email' | 'document'; subject?: string; body?: string };

const EMAIL_LABELS: Record<string, string> = {
  contract_reminder: 'Email · Reminder Kontrak',
  leave_submitted: 'Email · Pengajuan Cuti',
  leave_approved: 'Email · Cuti Disetujui',
  leave_rejected: 'Email · Cuti Ditolak',
  leave_cancelled: 'Email · Cuti Dibatalkan',
};

const DOC_LABELS: Record<string, string> = {
  surat_kontrak: 'Surat · Kontrak Kerja',
  surat_keterangan: 'Surat · Keterangan Kerja',
  surat_cuti: 'Surat · Izin Cuti',
};

const EMAIL_PLACEHOLDERS = [
  'nama', 'nik', 'email', 'jabatan', 'departemen', 'jenis', 'tanggal_mulai', 'tanggal_akhir',
  'milestone', 'sisa_hari', 'nama_pemohon', 'nama_approver', 'hari_kerja', 'alasan', 'catatan', 'status',
];

const DOC_PLACEHOLDERS = [
  'nama', 'nik', 'email', 'jabatan', 'departemen', 'tanggal_masuk', 'status_kontrak', 'atasan',
  'tanggal_cetak', 'jenis_kontrak', 'kontrak_mulai', 'kontrak_akhir', 'cuti_jenis', 'cuti_mulai',
  'cuti_akhir', 'alasan', 'tahun',
];

function unknownPlaceholders(text: string, known: string[]): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) if (!known.includes(m[1])) out.add(m[1]);
  return [...out];
}

/** Editor template email/dokumen: daftar kiri + editor kanan (mobile: daftar atas). */
export function TemplatePanel({
  emailTemplates,
  documentKeys,
}: {
  emailTemplates: EmailTemplateRow[];
  documentKeys: string[];
}) {
  const items: Item[] = [
    ...emailTemplates.map((t) => ({
      key: t.key,
      label: EMAIL_LABELS[t.key] ?? t.key,
      kind: 'email' as const,
      subject: t.subject,
      body: t.bodyHtml,
    })),
    ...documentKeys.map((k) => ({ key: k, label: DOC_LABELS[k] ?? k, kind: 'document' as const, body: '' })),
  ];

  const [selected, setSelected] = useState(items[0]?.key ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const [saving, startSave] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const toast = useToast();

  const current = items.find((i) => i.key === selected);

  useEffect(() => {
    setSelected(items[0]?.key ?? '');
    setSubject(items[0]?.subject ?? '');
    setBody(items[0]?.body ?? '');
    setError(null);
  }, []);

  const pick = (item: Item) => {
    setSelected(item.key);
    setSubject(item.subject ?? '');
    setBody(item.body ?? '');
    setError(null);
  };

  const known = current?.kind === 'email' ? EMAIL_PLACEHOLDERS : DOC_PLACEHOLDERS;
  const unknown = unknownPlaceholders(`${subject}\n${body}`, known);

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    if (!current) return { ok: false, message: 'Pilih template terlebih dahulu.' };
    const v = fd(formData);
    const content = String(v.bodyHtml ?? '');
    const subj = String(v.subject ?? '');

    if (current.kind === 'document' && !content.trim()) {
      return { ok: false, message: 'Konten kosong — isi konten surat sebelum menyimpan.' };
    }

    const res =
      current.kind === 'email'
        ? await saveEmailTemplate({ key: current.key, subject: subj, bodyHtml: content })
        : await saveDocumentTemplate({ key: current.key, name: current.label.replace('Surat · ', 'Surat '), content });
    const mapped = fromAction(res, ['subject', 'bodyHtml', 'content', 'key']);
    if (mapped?.ok) {
      toast.success('Template disimpan.');
      router.refresh();
    }
    return mapped;
  }

  const doReset = () =>
    startSave(async () => {
      if (!current) return;
      const res = await resetEmailTemplate({ key: current.key });
      if (res.ok) {
        toast.success('Template dikembalikan ke default.');
        setResetOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
        setResetOpen(false);
      }
    });

  const insertPlaceholder = (ph: string) => {
    const ta = textareaRef.current;
    const snippet = `{{${ph}}}`;
    if (!ta) {
      setBody((b) => b + snippet);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? start;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  if (items.length === 0) {
    return (
      <Card>
        <EmptyBox title="Belum ada template" description="Jalankan seed untuk mengisi template bawaan." />
      </Card>
    );
  }

  const dirty = current?.kind === 'email' ? subject !== (current.subject ?? '') || body !== (current.body ?? '') : body !== '';

  return (
    <div className="grid gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Daftar template */}
      <Card className="h-fit">
        <CardHeader title="Daftar Template" />
        <CardBody className="p-2">
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.key}>
                <button
                  type="button"
                  onClick={() => pick(it)}
                  aria-current={it.key === selected ? 'true' : undefined}
                  className={`w-full rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    it.key === selected ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader
          title={current?.label ?? 'Editor Template'}
          action={
            current?.kind === 'email' ? (
              <Button variant="dangerOutline" size="sm" onClick={() => setResetOpen(true)}>
                Kembalikan ke Default
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          <form action={formAction} noValidate className="space-y-4">
            {state && !state.ok && state.message && !error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {state.message}
              </div>
            )}

            {current?.kind === 'email' && (
              <Field id="subject" label="Subjek email" required>
                {(ctl) => <input {...ctl} name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls()} />}
              </Field>
            )}

            <Field
              id="bodyHtml"
              label={current?.kind === 'email' ? 'Isi email (HTML)' : 'Isi surat (teks)'}
              required
              error={unknown.length ? `Placeholder tidak dikenal: ${unknown.map((u) => `{{${u}}}`).join(', ')}` : undefined}
              helper={
                current?.kind === 'document'
                  ? 'Biarkan kosong untuk mempertahankan isi surat saat ini.'
                  : 'Gunakan placeholder di bawah untuk data dinamis.'
              }
            >
              {(ctl) => (
                <textarea
                  {...ctl}
                  ref={textareaRef}
                  name="bodyHtml"
                  rows={14}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck={false}
                  className={`${textareaCls()} font-mono text-[13px]`}
                />
              )}
            </Field>

            {/* Placeholder */}
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-slate-700">Placeholder tersedia</p>
              <div className="flex flex-wrap gap-1.5">
                {known.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertPlaceholder(ph)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[12px] text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {`{{${ph}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="lg" disabled={!dirty} onClick={() => pick(current!)}>
                Batalkan Perubahan
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={pending || saving}
                loadingLabel="Menyimpan…"
                disabled={unknown.length > 0}
              >
                Simpan Template
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={`Kembalikan ${current?.label ?? 'template'} ke default?`}
        description="Perubahan pada template ini akan dihapus."
        labelledBy="reset-template-title"
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" size="lg" loading={saving} loadingLabel="Memproses…" onClick={doReset}>
              Kembalikan ke Default
            </Button>
          </>
        }
      />
    </div>
  );
}

function EmptyBox({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
