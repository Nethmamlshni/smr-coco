import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ProductionSession } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

function getAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// PATCH /api/data/sessions/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ProductionSession.findByIdAndUpdate(params.id, body);
  return NextResponse.json({ success: true });
}
