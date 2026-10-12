import { NextRequest, NextResponse } from 'next/server';
import { listEmployees, createEmployee } from '@/lib/actions/employees';

export async function GET(request: NextRequest) {
  const res = await listEmployees(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}

export async function POST(request: NextRequest) {
  const res = await createEmployee(await request.json().catch(() => ({})));
  return NextResponse.json(res, { status: res.ok ? 201 : res.status });
}

