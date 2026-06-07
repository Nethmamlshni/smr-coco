import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ProductionSession } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

function getAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

function mapSession(s: any) {
  return {
    id: s._id.toString(),
    supervisor_id: s.supervisor_id,
    section_id: s.section_id,
    filling_type: s.filling_type,
    shift: s.shift,
    production_date: s.production_date,
    is_submitted: s.is_submitted,
    submitted_at: s.submitted_at,
    created_at: s.created_at,
  };
}

// GET /api/data/sessions
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const supervisorId = url.searchParams.get('supervisor_id');
  const sectionId = url.searchParams.get('section_id');
  const fillingType = url.searchParams.get('filling_type');
  const isSubmitted = url.searchParams.get('is_submitted');

  const filter: any = {};
  if (supervisorId) filter.supervisor_id = supervisorId;
  if (sectionId) filter.section_id = sectionId;
  if (fillingType) filter.filling_type = fillingType;
  if (isSubmitted !== null) filter.is_submitted = isSubmitted === 'true';

  await connectDB();
  const sessions = await ProductionSession.find(filter).lean();
  return NextResponse.json(sessions.map(mapSession));
}

// POST /api/data/sessions
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await connectDB();
  const session = await ProductionSession.create(body);
  return NextResponse.json(mapSession(session));
}
