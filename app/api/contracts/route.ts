import { NextRequest, NextResponse } from 'next/server';
import { createContract, listContracts } from '@/lib/actions/contracts';

export async function GET(request: NextRequest) {
  const res = await listContracts(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}

export async function POST(request: NextRequest) {
  const res = await createContract(await request.json().catch(() => ({})));
  return NextResponse.json(res, { status: res.ok ? 201 : res.status });
}
