import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// GET /api/data/users
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const users = await User.find().sort({ created_at: -1 }).lean();
  return NextResponse.json(users.map(u => ({
    id: u._id.toString(),
    username: u.username,
    full_name: u.full_name,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
  })));
}
