import { NextRequest, NextResponse } from 'next/server';
import { updateContract, listContracts } from '@/lib/actions/contracts';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const res = await listContracts(Object.fromEntries(request.nextUrl.searchParams));
  if (!res.ok) return NextResponse.json(res, { status: res.status });
  const items = (res.data as { items: { id: string }[] }).items.filter((c) => c.id === id);
  return NextResponse.json({ ...res, data: items[0] ?? null }, { status: items[0] ? 200 : 404 });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const res = await updateContract({ ...body, id });
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
