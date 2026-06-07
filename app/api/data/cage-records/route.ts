import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CageRecord, ProductionSession } from '@/lib/models';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

function getAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

function mapRecord(r: any) {
  return {
    id: r._id.toString(),
    session_id: r.session_id,
    cage_number: r.cage_number,
    employee_name: r.employee_name,
    contractor_name: r.contractor_name,
    raw_weight: r.raw_weight,
    coconut_type: r.coconut_type,
    final_weight: r.final_weight,
    coconut_count: r.coconut_count,
    buttons_completed: r.buttons_completed,
    is_completed: r.is_completed,
    production_date: r.production_date,
    section_id: r.section_id,
    filling_type: r.filling_type,
    shift: r.shift,
    supervisor_id: r.supervisor_id,
  };
}

// GET /api/data/cage-records
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');
  const fillingType = url.searchParams.get('filling_type');
  const sectionId = url.searchParams.get('section_id');
  const employeeName = url.searchParams.get('employee_name');
  const contractorName = url.searchParams.get('contractor_name');
  const cageNumber = url.searchParams.get('cage_number');

  await connectDB();

  const filter: any = { is_completed: true };
  if (sessionId) filter.session_id = sessionId;
  if (dateFrom) filter.production_date = { ...filter.production_date, $gte: dateFrom };
  if (dateTo) filter.production_date = { ...filter.production_date, $lte: dateTo };
  if (fillingType) filter.filling_type = fillingType;
  if (sectionId) filter.section_id = sectionId;
  if (employeeName) filter.employee_name = { $regex: employeeName, $options: 'i' };
  if (contractorName) filter.contractor_name = { $regex: contractorName, $options: 'i' };
  if (cageNumber) filter.cage_number = parseInt(cageNumber);

  const records = await CageRecord.find(filter)
    .sort({ production_date: -1, cage_number: 1 })
    .lean();

  return NextResponse.json(records.map(mapRecord));
}

// POST /api/data/cage-records
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await connectDB();
  const record = await CageRecord.create(body);
  return NextResponse.json(mapRecord(record));
}
