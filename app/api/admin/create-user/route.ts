import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, full_name, role, password } = await req.json();
    if (!username || !full_name || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const existing = await User.findOne({ username: username.trim() });
    if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      full_name: full_name.trim(),
      role: role || 'supervisor',
      password_hash,
      is_active: true,
    });

    return NextResponse.json({ success: true, userId: user._id.toString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
