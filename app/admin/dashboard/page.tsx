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
const groupDataByName = (records: CageRecord[], key: 'contractor_name' | 'employee_name') => {
  const map = new Map<string, { name: string; count: number; cages: string[] }>();

  records.forEach(r => {
    const name = r[key] || 'Unknown';
    const existing = map.get(name) || { name, count: 0, cages: [] };

    existing.count += r.coconut_count;

    if (!existing.cages.includes(r.cage_number.toString())) {
      existing.cages.push(r.cage_number.toString());
    }

    map.set(name, existing);
  });

  return Array.from(map.values());
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

const exportToExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production Report');

  // ==========================
  // COLORS
  // ==========================
  const brown = '5C3A1E';
  const green = '2D6A4F';
  const cream = 'FFF0E0';

  const headerStyle = {
    font: {
      bold: true,
      color: { argb: 'FFFFFF' },
      size: 11,
    },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brown },
    },
    alignment: {
      horizontal: 'center' as const,
      vertical: 'middle' as const,
    },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    },
  };

  // ==========================
  // REPORT TITLE
  // ==========================

  worksheet.mergeCells('A1:J2');

  const title = worksheet.getCell('A1');

  title.value = `SMR CNO Section Production Report - ${selectedDate}`;

  title.font = {
    size: 18,
    bold: true,
    color: { argb: green },
  };

  title.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  let row = 5;

  // ==========================
  // TABLE CREATOR
  // ==========================

 const createTable = (
  titleText: string,
  data: any[]
) => {
  if (!data.length) return;

  // Section Title
  worksheet.mergeCells(`A${row}:J${row}`);

  const titleCell = worksheet.getCell(`A${row}`);

  titleCell.value = titleText;

  titleCell.font = {
    bold: true,
    size: 14,
    color: { argb: 'FFFFFF' },
  };

  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: green },
  };

  titleCell.alignment = {
    horizontal: 'center',
  };

  row++;

  // Headers
  const headers = Object.keys(data[0]);

  const headerRow = worksheet.getRow(row);

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);

    cell.value = h;

    cell.font = {
      bold: true,
      color: { argb: 'FFFFFF' },
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brown },
    };

    cell.alignment = {
      horizontal: 'center',
    };

    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };
  });

  row++;

  // Data Rows
  data.forEach(item => {
    const values = Object.values(item);

    const dataRow = worksheet.addRow(values);

    dataRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
      };
    });

    row++;
  });

  // =====================
  // TOTAL ROW
  // =====================

  const totalRow = worksheet.addRow([]);

  totalRow.getCell(1).value = 'TOTAL';

  totalRow.getCell(1).font = {
    bold: true,
    color: { argb: 'FFFFFF' },
  };

  totalRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: green },
  };

  const countColumnIndex = headers.findIndex(
    h =>
      h === 'Count' ||
      h === 'TotalCoconuts' ||
      h === 'Total Coconut Count'
  );

  if (countColumnIndex >= 0) {
    const total = data.reduce(
      (sum, item) =>
        sum +
        Number(
          Object.values(item)[countColumnIndex]
        ),
      0
    );

    const totalCell =
      totalRow.getCell(
        countColumnIndex + 1
      );

    totalCell.value = total;

    totalCell.font = {
      bold: true,
      color: { argb: 'FFFFFF' },
    };

    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: green },
    };
  }

  totalRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };
  });

  row += 4;
};

  // ==========================
  // FULL FILLING
  // ==========================

  const fullData = cageRecords
    .filter(r => r.filling_type === 'full')
    .map(r => ({
      Date: r.production_date,
      Shift: r.shift,
      Cage: r.cage_number,
      Employee: r.employee_name,
      Contractor: r.contractor_name,
      Type: r.coconut_type,
      RawWeight: r.raw_weight,
      FinalWeight: r.final_weight,
      Count: r.coconut_count,
    }));

  createTable(
    'FULL FILLING REPORT',
    fullData
  );

  // ==========================
  // ADDITIONAL FILLING
  // ==========================

  const addData = cageRecords
    .filter(
      r =>
        r.filling_type ===
        'additional'
    )
    .map(r => ({
      Date: r.production_date,
      Shift: r.shift,
      Cage: r.cage_number,
      Employee: r.employee_name,
      Contractor: r.contractor_name,
      Type: r.coconut_type,
      RawWeight: r.raw_weight,
      FinalWeight: r.final_weight,
      Count: r.coconut_count,
    }));

  createTable(
    'ADDITIONAL FILLING REPORT',
    addData
  );

  // ==========================
  // EMPLOYEE REPORT
  // ==========================

  const employeeMap = new Map();

  cageRecords.forEach(r => {
    const emp =
      r.employee_name || 'N/A';

    employeeMap.set(
      emp,
      (employeeMap.get(emp) || 0) +
        r.coconut_count
    );
  });

  const employeeData = Array.from(
    employeeMap.entries()
  ).map(([name, total]) => ({
    Employee: name,
    TotalCoconuts: total,
  }));

  createTable(
    'EMPLOYEE REPORT',
    employeeData
  );

  // ==========================
  // CONTRACTOR REPORT
  // ==========================

  const contractorMap = new Map();

  cageRecords.forEach(r => {
    const contractor =
      r.contractor_name || 'N/A';

    contractorMap.set(
      contractor,
      (contractorMap.get(contractor) ||
        0) + r.coconut_count
    );
  });

  const contractorData =
    Array.from(
      contractorMap.entries()
    ).map(([name, total]) => ({
      Contractor: name,
      TotalCoconuts: total,
    }));

  createTable(
    'CONTRACTOR REPORT',
    contractorData
  );
  
  // ==========================
  // COLUMN WIDTHS
  // ==========================

  worksheet.columns.forEach(col => {
    col.width = 20;
  });

  // ==========================
  // DOWNLOAD
  // ==========================

  const buffer =
    await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    `SMR_${selectedDate}.xlsx`
  );
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
  title="Day Shift - Full Filling" 
  records={getGroupedRecords(dayRecords.filter(r => r.filling_type === 'full'))} 
  supervisors={supervisors} 
/>            
<ShiftTable 
  title="Day Shift - Additional Filling" 
  records={getGroupedRecords(dayRecords.filter(r => r.filling_type === 'additional'))} 
  supervisors={supervisors} 
/>
<ShiftTable 
  title="Night Shift - Full Filling" 
  records={getGroupedRecords(nightRecords.filter(r => r.filling_type === 'full'))} 
  supervisors={supervisors} 
/>
<ShiftTable 
  title="Night Shift - Additional Filling" 
  records={getGroupedRecords(nightRecords.filter(r => r.filling_type === 'additional'))} 
  supervisors={supervisors} 
/>  
              </>
            )}
            {activeTab === 'contractor' && (
              <>
                <ContractorTable title="Day Shift" records={dayRecords} />
                <ContractorTable title="Night Shift" records={nightRecords} />
              </>
            )}
            {activeTab === 'employee' && (
              <>
                <EmployeeTable title="Day Shift" records={dayRecords} />
                <EmployeeTable title="Night Shift" records={nightRecords} />
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ShiftTable({ title, records, supervisors }: { title: string; records: CageRecord[]; supervisors: Record<string, AppUser> }) {
  if (records.length === 0) return (
    <div>
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-2">{title}</h4>
      <p className="text-[#8B5E3C] text-sm italic">No records</p>
    </div>
  );
  return (
    <div>
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-3">{title}</h4>
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-[#FFF0E0]">
            {['Supervisor', 'Date', 'Cage No', 'Employee', 'Contractor', 'Type', 'Raw Wt', 'Final Wt', 'Count'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[#5C3A1E] uppercase tracking-wide border border-[#E8D5C0]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id} className="hover:bg-[#FFF8F0] border-b border-[#F0E0D0]">
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{supervisors[r.supervisor_id]?.full_name || '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{r.production_date}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410] text-center font-bold">{r.cage_number}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{r.employee_name}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{r.contractor_name}</td>
              <td className="px-3 py-2 border border-[#E8D5C0]"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.coconut_type === 'Red' ? 'bg-red-100 text-red-700' : r.coconut_type === 'Black' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>{r.coconut_type || '-'}</span></td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{r.raw_weight ? `${r.raw_weight} kg` : '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410] font-semibold">{r.final_weight ? `${r.final_weight} kg` : '-'}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#2D6A4F] font-bold">{r.coconut_count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractorTable({ title, records }: { title: string; records: CageRecord[] }) {
  const groupedData = groupDataByName(records, 'contractor_name');

  if (groupedData.length === 0) return (
    <div>
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-2">{title}</h4>
      <p className="text-[#8B5E3C] text-sm italic">No records</p>
    </div>
  );

  return (
    <div>
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-3">{title}</h4>
      <table className="w-full text-sm border-collapse min-w-[400px]">
        <thead>
          <tr className="bg-[#FFF0E0]">
            {['Contractor Name', 'Cages', 'Total Coconuts'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[#5C3A1E] uppercase tracking-wide border border-[#E8D5C0]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedData.map((r, i) => (
            <tr key={i} className="hover:bg-[#FFF8F0] border-b border-[#F0E0D0]">
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410] font-semibold">{r.name}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{r.cages.join(', ')}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#2D6A4F] font-bold">{r.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeTable({ title, records }: { title: string; records: CageRecord[] }) {
  const groupedData = groupDataByName(records, 'employee_name');

  if (groupedData.length === 0) return (
    <div>
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-2">{title}</h4>
      <p className="text-[#8B5E3C] text-sm italic">No records</p>
    </div>
  );

  return (
    <div>
      <h4 className="font-semibold text-[#5C3A1E] text-sm mb-3">{title}</h4>
      <table className="w-full text-sm border-collapse min-w-[300px]">
        <thead>
          <tr className="bg-[#FFF0E0]">
            {['Employee Name', 'Cages', 'Total Coconuts'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[#5C3A1E] uppercase tracking-wide border border-[#E8D5C0]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedData.map((r, i) => (
            <tr key={i} className="hover:bg-[#FFF8F0] border-b border-[#F0E0D0]">
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410] font-semibold">{r.name}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#3D2410]">{r.cages.join(', ')}</td>
              <td className="px-3 py-2 border border-[#E8D5C0] text-[#2D6A4F] font-bold">{r.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}