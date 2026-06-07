import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Your account has been deactivated' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at.toISOString(),
      },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
