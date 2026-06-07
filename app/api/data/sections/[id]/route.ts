import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Section } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

function getAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/data/sections/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const section = await Section.findById(params.id).lean();
  if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: section._id.toString(),
    name: section.name,
    section_type: section.section_type,
    cage_count: section.cage_count,
    buttons_per_cage: section.buttons_per_cage,
    is_active: section.is_active,
    display_order: section.display_order,
  });
}

// PATCH /api/data/sections/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await connectDB();
  await Section.findByIdAndUpdate(params.id, body);
  return NextResponse.json({ success: true });
}
