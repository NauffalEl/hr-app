import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { runReminderCron } from '@/lib/reminder';

// Cron reminder kontrak. HANYA Bearer token == CRON_SECRET (timing-safe).
// Placeholder CRON_SECRET di production = 501.
export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || /^changeme/i.test(secret) || /your[-_]/i.test(secret)) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok: false, error: 'CRON_SECRET belum dikonfigurasi' }, { status: 501 });
    }
    // Development: izinkan tanpa token agar bisa diuji lokal.
  } else {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || !safeEqual(token, secret)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await runReminderCron();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error('[cron/reminder]', e);
    return NextResponse.json({ ok: false, error: 'Kesalahan server' }, { status: 500 });
  }
}
