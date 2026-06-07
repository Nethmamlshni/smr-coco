import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();
    if (secret !== 'cocofactory-seed-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      return NextResponse.json({ message: 'Admin already exists', userId: existing._id.toString() });
    }

    const password_hash = await bcrypt.hash('Admin@1234', 10);
    const user = await User.create({
      username: 'admin',
      full_name: 'Factory Admin',
      role: 'admin',
      password_hash,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      userId: user._id.toString(),
      message: 'Admin created: username=admin, password=Admin@1234',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
