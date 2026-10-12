import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/actions/dashboard';

export async function GET() {
  const res = await getDashboardStats();
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
