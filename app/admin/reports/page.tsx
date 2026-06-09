'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/AdminLayout';
import { CageRecord, AppUser, Section } from '@/lib/types';
import { db } from '@/lib/db-client';
import * as XLSX from 'xlsx';
import { Download, Search, Calendar, ListFilter as Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminReportsPage() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<CageRecord[]>([]);
  const [supervisors, setSupervisors] = useState<Record<string, AppUser>>({});
  const [sections, setSections] = useState<Record<string, Section>>({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    fillingType: '',
    sectionId: '',
    employeeName: '',
    contractorName: '',
    cageNumber: '',
  });
  const [allSections, setAllSections] = useState<Section[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || appUser?.role !== 'admin')) router.replace('/login');
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (appUser?.role === 'admin') {
      loadMeta();
    }
  }, [appUser]);

  const loadMeta = async () => {
    const [users, sects] = await Promise.all([
      db.users.list(),
      db.sections.list(),
    ]);
    const supMap: Record<string, AppUser> = {};
    users.forEach(u => { supMap[u.id] = u; });
    setSupervisors(supMap);
    const sectMap: Record<string, Section> = {};
    sects.forEach(s => { sectMap[s.id] = s; });
    setSections(sectMap);
    setAllSections(sects);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const records = await db.cageRecords.list({
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      filling_type: filters.fillingType,
      section_id: filters.sectionId,
      employee_name: filters.employeeName,
      contractor_name: filters.contractorName,
      cage_number: filters.cageNumber,
    }).catch(() => []);
    setRecords(records);
    setLoading(false);
  };
  
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const exportData = records.map(r => ({
      'Date': r.production_date,
      'Shift': r.shift,
      'Section': sections[r.section_id]?.name || '-',
      'Filling Type': r.filling_type === 'full' ? 'Full Filling' : 'Additional Filling',
      'Cage No': r.cage_number,
      'Employee Name': r.employee_name,
      'Contractor Name': r.contractor_name,
      'Coconut Type': r.coconut_type || '-',
      'Raw Weight (kg)': r.raw_weight || '-',
      'Final Weight (kg)': r.final_weight || '-',
      'Coconut Count': r.coconut_count,
      'Supervisor': supervisors[r.supervisor_id]?.full_name || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Production Report');
    XLSX.writeFile(wb, `CocoFactory_Report_${filters.dateFrom}_to_${filters.dateTo}.xlsx`);
  };

  if (authLoading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2410]" style={{ fontFamily: 'Georgia, serif' }}>Production Reports</h1>
            <p className="text-[#8B5E3C] text-sm mt-0.5">Search and export historical production data</p>
          </div>
          {records.length > 0 && (
            <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-md">
              <Download size={16} /> Export Excel ({records.length})
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-center gap-2 mb-4 text-[#5C3A1E] font-semibold text-sm">
            <Filter size={16} /> Filter Records
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Filling Type</label>
              <select value={filters.fillingType} onChange={e => setFilters(f => ({ ...f, fillingType: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm bg-white">
                <option value="">All Types</option>
                <option value="full">Full Filling</option>
                <option value="additional">Additional Filling</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Section</label>
              <select value={filters.sectionId} onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm bg-white">
                <option value="">All Sections</option>
                {allSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Employee Name</label>
              <input type="text" value={filters.employeeName} onChange={e => setFilters(f => ({ ...f, employeeName: e.target.value }))} placeholder="Search..."
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Contractor Name</label>
              <input type="text" value={filters.contractorName} onChange={e => setFilters(f => ({ ...f, contractorName: e.target.value }))} placeholder="Search..."
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1">Cage Number</label>
              <input type="number" value={filters.cageNumber} onChange={e => setFilters(f => ({ ...f, cageNumber: e.target.value }))} placeholder="e.g. 5"
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
            </div>
            <div className="flex items-end">
              <button onClick={fetchRecords} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#5C3A1E] hover:bg-[#3D2410] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
                <Search size={16} />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Results table */}
        {records.length > 0 && (
          <div className="bg-white rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E8D5C0] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#5C3A1E]">{records.length} record{records.length !== 1 ? 's' : ''} found</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FFF0E0]">
                    {['Date','Shift','Section','Type','Cage','Employee','Contractor','Coc. Type','Raw Wt','Final Wt','Count'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#5C3A1E] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E6D3]">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-[#FFFAF5] transition-colors">
                      <td className="px-4 py-2.5 text-[#3D2410] whitespace-nowrap font-medium">{r.production_date}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.shift === 'day' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{r.shift}</span></td>
                      <td className="px-4 py-2.5 text-[#3D2410] whitespace-nowrap">{sections[r.section_id]?.name || '-'}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.filling_type === 'full' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{r.filling_type === 'full' ? 'Full' : 'Additional'}</span></td>
                      <td className="px-4 py-2.5 text-[#3D2410] text-center font-bold">{r.cage_number}</td>
                      <td className="px-4 py-2.5 text-[#3D2410] whitespace-nowrap">{r.employee_name || '-'}</td>
                      <td className="px-4 py-2.5 text-[#3D2410] whitespace-nowrap">{r.contractor_name || '-'}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.coconut_type === 'Red' ? 'bg-red-100 text-red-700' : r.coconut_type === 'Black' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>{r.coconut_type || '-'}</span></td>
                      <td className="px-4 py-2.5 text-[#3D2410] whitespace-nowrap">{r.raw_weight ? `${r.raw_weight}kg` : '-'}</td>
                      <td className="px-4 py-2.5 text-[#3D2410] whitespace-nowrap font-semibold">{r.final_weight ? `${r.final_weight}kg` : '-'}</td>
                      <td className="px-4 py-2.5 text-[#2D6A4F] font-bold">{r.coconut_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-2xl card-shadow flex flex-col items-center justify-center py-20 text-[#8B5E3C]">
            <Calendar size={40} className="opacity-30 mb-3" />
            <p className="font-medium">Use the filters above to search production records</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
