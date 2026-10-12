import { NextRequest, NextResponse } from 'next/server';
import { getEmployee, updateEmployee, deleteEmployee } from '@/lib/actions/employees';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const res = await getEmployee({ id });
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const res = await updateEmployee({ ...body, id });
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const res = await deleteEmployee({ id });
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
