'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/AdminLayout';
import { CageRecord, AppUser } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Calendar, TrendingUp, Package, Users, CircleAlert as AlertCircle, ChevronDown } from 'lucide-react';

interface DashboardStats {
  totalCages: number;
  totalCoconuts: number;
  totalWeight: number;
  activeSupervisors: number;
}

interface ProductionData {
  date: string;
  coconuts: number;
  cages: number;
}
// Add this helper function outside the component
const groupDataByName = (mergedRecords: any[], field: 'contractor_name' | 'employee_name') => {
  const map = new Map<string, { name: string, cages: Set<string>, count: number }>();

  mergedRecords.forEach(r => {
    // If name is empty, categorize as 'Unassigned'
    const name = r[field] && r[field].trim() !== "" ? r[field] : 'Unassigned';
    
    if (!map.has(name)) {
      map.set(name, { name, cages: new Set<string>(), count: 0 });
    }
    const entry = map.get(name)!;
    entry.cages.add(r.cage_number.toString());
    
    // Add total from the merged object
    entry.count += (r.total_coconut_count || 0);
  });

  return Array.from(map.values()).map(e => ({
    ...e,
    cages: Array.from(e.cages)
  }));
};
const getMergedShiftRecords = (records: CageRecord[]) => {
  const map = new Map<string, any>();

  records.forEach((r) => {
    // Grouping by Date, Shift, and Cage Number
    const key = `${r.production_date}-${r.shift}-${r.cage_number}`;

    if (!map.has(key)) {
      map.set(key, {
        supervisor_id: r.supervisor_id,
        production_date: r.production_date,
        shift: r.shift,
        cage_number: r.cage_number,
        employee_name: r.employee_name || '',
        contractor_name: r.contractor_name || '',
        coconut_type: r.coconut_type || '',
        raw_weight: 0,
        final_weight: 0,
        full_filling_count: 0,
        additional_filling_count: 0,
      });
    }

    const row = map.get(key);

    // If data is missing in one record, update from the other
    if (r.employee_name) row.employee_name = r.employee_name;
    if (r.contractor_name) row.contractor_name = r.contractor_name;
    if (r.coconut_type) row.coconut_type = r.coconut_type;

    // Split counts based on filling_type
    if (r.filling_type === 'full') {
      row.full_filling_count = r.coconut_count || 0;
      row.raw_weight = r.raw_weight || 0;
      row.final_weight = r.final_weight || 0;
    } else if (r.filling_type === 'additional') {
      row.additional_filling_count = r.coconut_count || 0;
    }
  });

  return Array.from(map.values()).map(r => ({
    ...r,
    total_coconut_count: r.full_filling_count + r.additional_filling_count
  }));
};
export default function AdminDashboard() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState<DashboardStats>({ totalCages: 0, totalCoconuts: 0, totalWeight: 0, activeSupervisors: 0 });
  const [chartData, setChartData] = useState<ProductionData[]>([]);
  const [cageRecords, setCageRecords] = useState<CageRecord[]>([]);
  const [supervisors, setSupervisors] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shift' | 'contractor' | 'employee'>('shift');

  useEffect(() => {
    if (!authLoading && (!user || appUser?.role !== 'admin')) {
      router.replace('/login');
    }
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (appUser?.role === 'admin') {
      fetchDashboardData();
    }
  }, [selectedDate, appUser]);
  const getGroupedRecords = (records: CageRecord[]) => {
  const map = new Map<string, CageRecord>();
  records.forEach(r => {
   
    const key = `${r.cage_number}-${r.filling_type}`; 
    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.coconut_count += r.coconut_count;
      existing.final_weight = (existing.final_weight || 0) + (r.final_weight || 0);
    } else {
      map.set(key, { ...r });
    }
  });
  return Array.from(map.values());
};

// Helper to group by a specific key (contractor or employee)

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const records = await db.cageRecords.list({ date_from: selectedDate, date_to: selectedDate });
      setCageRecords(getGroupedRecords(records));

      const users = await db.users.list();
      const supervisorMap: Record<string, AppUser> = {};
      users.forEach(u => { supervisorMap[u.id] = u; });
      setSupervisors(supervisorMap);

      const totalCoconuts = records.reduce((s, r) => s + (r.coconut_count || 0), 0);
      const totalWeight = records.reduce((s, r) => s + (r.final_weight || 0), 0);
      setStats({
        totalCages: records.length,
        totalCoconuts,
        totalWeight,
        activeSupervisors: new Set(records.map(r => r.supervisor_id)).size,
      });

      const chartPromises = Array.from({ length: 7 }, async (_, i) => {
        const d = format(subDays(new Date(selectedDate), 6 - i), 'yyyy-MM-dd');
        const data = await db.cageRecords.list({ date_from: d, date_to: d });
        return {
          date: format(new Date(d + 'T00:00:00'), 'MMM dd'),
          coconuts: data.reduce((s, r) => s + r.coconut_count, 0),
          cages: data.length,
        };
      });
      const chartResults = await Promise.all(chartPromises);
      setChartData(chartResults);
    } finally {
      setLoading(false);
    }
  };
const groupBySupervisor = (records: CageRecord[], supervisors: Record<string, AppUser>) => {
  const map = new Map<string, { name: string, count: number }>();

  records.forEach(r => {
    const supervisorName = supervisors[r.supervisor_id]?.full_name || 'Unassigned';
    if (!map.has(supervisorName)) {
      map.set(supervisorName, { name: supervisorName, count: 0 });
    }
    map.get(supervisorName)!.count += (r.coconut_count || 0);
  });

  return Array.from(map.values());
};
const exportToExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production Report');

  const brown = '5C3A1E';
  const green = '2D6A4F';

  // 1. Title
  worksheet.mergeCells('A1:L2');
  const title = worksheet.getCell('A1');
  title.value = `SMR CNO Section Production Report - ${selectedDate}`;
  title.font = { size: 18, bold: true, color: { argb: green } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  let row = 4;

  // Helper for simple tables (Employee, Contractor, Supervisor, Full/Add Details)
  const createSimpleTable = (titleText: string, headers: string[], data: any[]) => {
    worksheet.mergeCells(`A${row}:C${row}`);
    const titleCell = worksheet.getCell(`A${row}`);
    titleCell.value = titleText;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
    titleCell.font = { bold: true, color: { argb: 'FFFFFF' } };
    row++;

    worksheet.getRow(row).values = headers;
    worksheet.getRow(row).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brown } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    row++;

    data.forEach(item => {
      const r = worksheet.addRow(Object.values(item));
      r.eachCell(c => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
      row++;
    });

    // Total Row
    const total = data.reduce((sum, item) => sum + (Number(Object.values(item).pop()) || 0), 0);
    const totalRow = worksheet.addRow(['', 'TOTAL', total]);
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(3).font = { bold: true, color: { argb: green } };
    row += 3;
  };

  // Helper for Shift Summary (Detailed)
  const createShiftTable = (titleText: string, records: any[]) => {
    worksheet.mergeCells(`A${row}:K${row}`);
    const titleCell = worksheet.getCell(`A${row}`);
    titleCell.value = titleText;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
    titleCell.font = { bold: true, color: { argb: 'FFFFFF' } };
    row++;

    const headers = ['Supervisor', 'Date', 'Cage', 'Employee', 'Contractor', 'Type', 'Raw Wt', 'Final Wt', 'Full Filling', 'Additional', 'Total Count'];
    worksheet.getRow(row).values = headers;
    worksheet.getRow(row).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brown } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    row++;

    // Row-by-row data
    records.forEach(r => {
      const dr = worksheet.addRow([
        supervisors[r.supervisor_id]?.full_name || '-',
        r.production_date, r.cage_number, r.employee_name || '-', r.contractor_name || '-',
        r.coconut_type || '-', r.raw_weight, r.final_weight,
        r.full_filling_count, r.additional_filling_count, r.total_coconut_count
      ]);
      dr.eachCell(c => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
      row++;
    });

    // --- MEHENA TOTAL ROW EKA ADD KARANNA ---
    const totalCount = records.reduce((sum, r) => sum + (r.total_coconut_count || 0), 0);
    const totalRow = worksheet.addRow([
        '', '', '', '', '', '', '', '', '', 'TOTAL:', totalCount
    ]);
    
    // Total row eke style eka
    totalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: green } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    row += 3; // Table dekak athara ida
  };
  // GENERATING 7 TABLES
  createShiftTable('DAY SHIFT SUMMARY', getMergedShiftRecords(dayRecords));
  createShiftTable('NIGHT SHIFT SUMMARY', getMergedShiftRecords(nightRecords));
  
  createSimpleTable('EMPLOYEE SUMMARY', ['Name', 'Cages', 'Total Coconuts'], groupDataByName(getMergedShiftRecords(cageRecords), 'employee_name').map(e => ({ Name: e.name, Cages: e.cages.join(','), Total: e.count })));
  createSimpleTable('CONTRACTOR SUMMARY', ['Name', 'Cages', 'Total Coconuts'], groupDataByName(getMergedShiftRecords(cageRecords), 'contractor_name').map(c => ({ Name: c.name, Cages: c.cages.join(','), Total: c.count })));
  createSimpleTable('FULL FILLING DETAILS', ['Cage No', 'Count'], cageRecords.filter(r => r.filling_type === 'full').map(r => ({ Cage: r.cage_number, Count: r.coconut_count })));
  createSimpleTable('ADDITIONAL FILLING DETAILS', ['Cage No', 'Count'], cageRecords.filter(r => r.filling_type === 'additional').map(r => ({ Cage: r.cage_number, Count: r.coconut_count })));
  createSimpleTable('SUPERVISOR SUMMARY', ['Supervisor Name', 'Total Coconuts'], groupBySupervisor(cageRecords, supervisors).map(s => ({ Name: s.name, Total: s.count })));

  worksheet.columns.forEach(col => col.width = 15);
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `SMR_Full_Report_${selectedDate}.xlsx`);
};
  // Prepare table data
  const dayRecords = cageRecords.filter(r => r.shift === 'day');
  const nightRecords = cageRecords.filter(r => r.shift === 'night');

  const pieData = [
    { name: 'Full Filling', value: cageRecords.filter(r => r.filling_type === 'full').length },
    { name: 'Additional', value: cageRecords.filter(r => r.filling_type === 'additional').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#5C3A1E', '#2D6A4F'];

  if (authLoading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2410]" style={{ fontFamily: 'Georgia, serif' }}>
              Production Dashboard
            </h1>
            <p className="text-[#8B5E3C] text-sm mt-0.5">Factory production overview and analytics</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-[#D4B896] rounded-xl px-3 py-2 text-sm">
              <Calendar size={16} className="text-[#8B5E3C]" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="outline-none bg-transparent text-[#3D2410] font-medium cursor-pointer"
              />
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shadow-md"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Cages Completed', value: stats.totalCages, icon: <Package size={22} />, color: '#5C3A1E', bg: '#FFF0E0' },
            { label: 'Total Coconuts', value: stats.totalCoconuts.toLocaleString(), icon: <span className="text-xl">🥥</span>, color: '#2D6A4F', bg: '#E8F5EE' },
            { label: 'Total Weight (kg)', value: stats.totalWeight.toFixed(0), icon: <TrendingUp size={22} />, color: '#B8860B', bg: '#FFF8E0' },
            { label: 'Active Supervisors', value: stats.activeSupervisors, icon: <Users size={22} />, color: '#C0392B', bg: '#FEECEC' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-5 card-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-[#3D2410]">{loading ? '...' : card.value}</div>
              <div className="text-xs text-[#8B5E3C] font-medium mt-1">{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow">
            <h3 className="text-[#3D2410] font-semibold mb-4">7-Day Production Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5E6D3" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B5E3C' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8B5E3C' }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #D4B896', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="coconuts" fill="#5C3A1E" radius={[4, 4, 0, 0]} name="Coconuts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 card-shadow">
            <h3 className="text-[#3D2410] font-semibold mb-4">Filling Type Split</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D4B896', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[#8B5E3C]">
                <AlertCircle size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No data for selected date</p>
              </div>
            )}
          </div>
        </div>

        {/* Tables */}
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="border-b border-[#E8D5C0] px-5 py-3 flex items-center gap-2">
            {(['shift', 'contractor', 'employee'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-[#5C3A1E] text-white'
                    : 'text-[#8B5E3C] hover:bg-[#FFF0E0]'
                }`}
              >
                {tab === 'shift' ? 'Shift Summary' : tab === 'contractor' ? 'Contractor' : 'Employee'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-6 overflow-x-auto">
            {activeTab === 'shift' && (
              <>
<ShiftTable
  title="Day Shift"
  records={getMergedShiftRecords(dayRecords)}
  supervisors={supervisors}
/>

<ShiftTable
  title="Night Shift"
  records={getMergedShiftRecords(nightRecords)}
  supervisors={supervisors}
/>
              </>
            )}
            {activeTab === 'contractor' && (
    <>
      <ContractorTable 
        title="Day Shift" 
        records={getMergedShiftRecords(dayRecords)} // Mehema pass karanna
      />
      <ContractorTable 
        title="Night Shift" 
        records={getMergedShiftRecords(nightRecords)} // Mehema pass karanna
      />
    </>
  )}
  {activeTab === 'employee' && (
    <>
      <EmployeeTable 
        title="Day Shift" 
        records={getMergedShiftRecords(dayRecords)} // Mehema pass karanna
      />
      <EmployeeTable 
        title="Night Shift" 
        records={getMergedShiftRecords(nightRecords)} // Mehema pass karanna
      />
    </>
  )}
</div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ShiftTable({ title, records, supervisors }: { title: string; records: any[]; supervisors: Record<string, AppUser> }) {
  return (
    <div className="mb-8">
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-3">{title}</h4>
      <table className="w-full text-sm border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-[#FFF0E0]">
            {['Supervisor', 'Date', 'Cage No', 'Employee', 'Contractor', 'Type', 'Raw Wt', 'Final Wt', 'Full Filling', 'Additional', 'Total Count'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[#5C3A1E] uppercase border border-[#E8D5C0]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="hover:bg-[#FFF8F0] border-b border-[#F0E0D0]">
              <td className="px-3 py-2 border border-[#E8D5C0]">{supervisors[r.supervisor_id]?.full_name || '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.production_date}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] font-bold text-center">{r.cage_number}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.employee_name || '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.contractor_name || '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.coconut_type || '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.raw_weight} kg</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.final_weight} kg</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-center">{r.full_filling_count}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-center">{r.additional_filling_count}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] font-bold text-[#2D6A4F]">{r.total_coconut_count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractorTable({ title, records }: { title: string; records: CageRecord[] }) {
  const groupedData = groupDataByName(records, 'contractor_name');

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-3">{title}</h4>
      <table className="w-full text-sm border-collapse min-w-[400px]">
        <thead>
          <tr className="bg-[#FFF0E0]">
            <th className="px-3 py-2 text-left text-xs text-[#5C3A1E] border border-[#E8D5C0]">Contractor Name</th>
            <th className="px-3 py-2 text-left text-xs text-[#5C3A1E] border border-[#E8D5C0]">Cages</th>
            <th className="px-3 py-2 text-left text-xs text-[#5C3A1E] border border-[#E8D5C0]">Total Coconuts</th>
          </tr>
        </thead>
        <tbody>
          {groupedData.length > 0 ? groupedData.map((r, i) => (
            <tr key={i} className="border-b border-[#F0E0D0]">
              <td className="px-3 py-2 border border-[#E8D5C0] font-semibold">{r.name}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.cages.join(', ')}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] font-bold text-[#2D6A4F]">{r.count.toLocaleString()}</td>
            </tr>
          )) : <tr><td colSpan={3} className="p-4 text-center text-gray-500">No records found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeTable({ title, records }: { title: string; records: CageRecord[] }) {
  const groupedData = groupDataByName(records, 'employee_name');

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-3">{title}</h4>
      <table className="w-full text-sm border-collapse min-w-[300px]">
        <thead>
          <tr className="bg-[#FFF0E0]">
            <th className="px-3 py-2 text-left text-xs text-[#5C3A1E] border border-[#E8D5C0]">Employee Name</th>
            <th className="px-3 py-2 text-left text-xs text-[#5C3A1E] border border-[#E8D5C0]">Cages</th>
            <th className="px-3 py-2 text-left text-xs text-[#5C3A1E] border border-[#E8D5C0]">Total Coconuts</th>
          </tr>
        </thead>
        <tbody>
          {groupedData.length > 0 ? groupedData.map((r, i) => (
            <tr key={i} className="border-b border-[#F0E0D0]">
              <td className="px-3 py-2 border border-[#E8D5C0] font-semibold">{r.name}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]">{r.cages.join(', ')}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] font-bold text-[#2D6A4F]">{r.count.toLocaleString()}</td>
            </tr>
          )) : <tr><td colSpan={3} className="p-4 text-center text-gray-500">No records found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}