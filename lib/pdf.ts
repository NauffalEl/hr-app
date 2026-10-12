import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { ActionError } from '@/lib/auth';

export const DOCUMENT_TYPES = ['kontrak', 'keterangan', 'cuti'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const TEMPLATE_KEY: Record<DocumentType, string> = {
  kontrak: 'surat_kontrak',
  keterangan: 'surat_keterangan',
  cuti: 'surat_cuti',
};

export type DocumentData = Record<string, string | number>;

// Isi template pakai {{placeholder}}; logika rendering di sini (bukan di route).
export function renderDocumentContent(content: string, data: DocumentData): string[] {
  const replaced = content.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => String(data[k] ?? ''));
  return replaced.split(/\r?\n/);
}

export async function buildDocumentPdf(type: DocumentType, data: DocumentData): Promise<Uint8Array> {
  if (!DOCUMENT_TYPES.includes(type)) throw new ActionError(400, 'Jenis dokumen tidak dikenal');

  const tpl = await prisma.documentTemplate.findUnique({ where: { key: TEMPLATE_KEY[type] } });
  if (!tpl) throw new ActionError(500, 'Template dokumen belum diatur');

  const lines = renderDocumentContent(tpl.content, data);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]); // A4
  const marginX = 56;
  let y = 786;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const isTitle = line.startsWith('# ');
    const text = isTitle ? line.slice(2) : line;
    const size = isTitle ? 14 : 11;
    page.drawText(text, {
      x: marginX,
      y,
      size,
      font: isTitle ? bold : font,
      color: rgb(0, 0, 0),
    });
    y -= isTitle ? 24 : 16;
    if (y < 72) break; // ringkas: sisanya dipotong (ponytail: multi-page bila dokumen > 1 halaman)
  }

  return doc.save();
}
