import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ user: null });

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user || !user.is_active) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
