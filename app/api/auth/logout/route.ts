import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
