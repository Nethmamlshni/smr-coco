import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// PATCH /api/admin/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { full_name, role, is_active } = await req.json();
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await User.findByIdAndUpdate(params.id, { full_name, role, is_active, updated_at: new Date() });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
