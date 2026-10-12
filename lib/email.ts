import { Resend } from 'resend';

export type SendResult = { sent: boolean; fallback?: boolean; error?: string };

const FROM = process.env.EMAIL_FROM ?? 'HR App <onboarding@resend.dev>';

function apiKeyConfigured(): boolean {
  const key = process.env.RESEND_API_KEY ?? '';
  return !!key && !/your[-_]/i.test(key) && !key.startsWith('re_placeholder');
}

// Kirim email. Tanpa API key valid (dev/placeholder) → fallback console {sent:false, fallback:true}.
export async function sendEmail(params: { to: string; subject?: string; html: string }): Promise<SendResult> {
  if (!apiKeyConfigured()) {
    console.log('[email:console-fallback]', JSON.stringify({ to: params.to, subject: params.subject }));
    return { sent: false, fallback: true };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [params.to],
      subject: params.subject ?? '',
      html: params.html,
    });
    if (error) return { sent: false, fallback: true, error: error.message };
    return { sent: true, ...(data ? {} : {}) };
  } catch (e) {
    return { sent: false, fallback: true, error: e instanceof Error ? e.message : String(e) };
  }
}

export function renderTemplate(
  tpl: { subject: string; bodyHtml: string },
  vars: Record<string, string>
): { subject: string; html: string } {
  const replace = (s: string) =>
    s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? '');
  return { subject: replace(tpl.subject), html: replace(tpl.bodyHtml) };
}

export async function sendTemplateEmail(params: {
  to: string;
  subject?: string;
  html: string;
}): Promise<SendResult> {
  return sendEmail(params);
}
