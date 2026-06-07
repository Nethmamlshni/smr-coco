import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Section } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

function getAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/data/sections
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get('active') === 'true';

  const filter = activeOnly ? { is_active: true } : {};
  const sections = await Section.find(filter).sort({ display_order: 1 }).lean();
  return NextResponse.json(sections.map(s => ({
    id: s._id.toString(),
    name: s.name,
    section_type: s.section_type,
    cage_count: s.cage_count,
    buttons_per_cage: s.buttons_per_cage,
    is_active: s.is_active,
    display_order: s.display_order,
  })));
}

// POST /api/data/sections
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await connectDB();
  const section = await Section.create(body);
  return NextResponse.json({ id: section._id.toString(), ...body });
}
