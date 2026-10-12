import { NextRequest, NextResponse } from 'next/server';
import { approveLeave, rejectLeave, cancelLeave } from '@/lib/actions/leaves';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/leaves/[id] { action: 'approve'|'reject'|'cancel', catatan? }
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'approve') {
    const res = await approveLeave({ id, catatan: body?.catatan });
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  }
  if (action === 'reject') {
    const res = await rejectLeave({ id, catatan: body?.catatan });
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  }
  if (action === 'cancel') {
    const res = await cancelLeave({ id });
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  }
  return NextResponse.json({ ok: false, status: 400, error: "action harus 'approve'|'reject'|'cancel'" }, { status: 400 });
}
