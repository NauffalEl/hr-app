import { NextRequest, NextResponse } from 'next/server';
import { submitLeave, listLeaves } from '@/lib/actions/leaves';

export async function GET(request: NextRequest) {
  const res = await listLeaves(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}

export async function POST(request: NextRequest) {
  const res = await submitLeave(await request.json().catch(() => ({})));
  return NextResponse.json(res, { status: res.ok ? 201 : res.status });
}
