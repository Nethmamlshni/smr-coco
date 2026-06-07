'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SupervisorLayout } from '@/components/SupervisorLayout';
import { Section, ProductionSession, CageRecord } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleCheck as CheckCircle, X, CircleAlert as AlertCircle, Plus, Users } from 'lucide-react';
import { format } from 'date-fns';

type CoconutType = 'Red' | 'Black' | 'Small';
const DEDUCTIONS: Record<CoconutType, number> = { Small: 108, Red: 136, Black: 139 };

interface CageState {
  cage_number: number;
  employee_name: string;
  contractor_name: string;
  buttons_completed: number;
  raw_weight: string;
  coconut_type: CoconutType | '';
  is_completed: boolean;
  db_id?: string;
}

export default function AdditionalFillingPage({ params }: { params: { sectionId: string } }) {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section | null>(null);
  const [session, setSession] = useState<ProductionSession | null>(null);
  const [cages, setCages] = useState<CageState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCage, setSelectedCage] = useState<number | null>(null);
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [productionDate, setProductionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [showCageModal, setShowCageModal] = useState(false);
  const [showNamesModal, setShowNamesModal] = useState(false);
  const [cageFormErrors, setCageFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !appUser)) router.replace('/login');
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (appUser && params.sectionId) loadSectionAndSession();
  }, [appUser, params.sectionId]);

  const loadSectionAndSession = async () => {
    setLoading(true);
    const sect = await db.sections.get(params.sectionId).catch(() => null);
    if (!sect) { setLoading(false); return; }
    setSection(sect);

    const sessions = await db.sessions.list({
      supervisor_id: appUser!.id,
      section_id: params.sectionId,
      filling_type: 'additional',
      is_submitted: false,
    });
    const existingSession = sessions[0] || null;

    if (existingSession) {
      setSession(existingSession);
      setShift(existingSession.shift as 'day' | 'night');
      setProductionDate(existingSession.production_date);
      const existingCages = await db.cageRecords.list({ session_id: existingSession.id });

      const loaded: CageState[] = existingCages.map(r => ({
        cage_number: r.cage_number,
        employee_name: r.employee_name,
        contractor_name: r.contractor_name,
        buttons_completed: r.buttons_completed,
        raw_weight: r.raw_weight?.toString() || '',
        coconut_type: (r.coconut_type as CoconutType | '') || '',
        is_completed: r.is_completed,
        db_id: r.id,
      }));
      const usedNums = new Set(loaded.map(c => c.cage_number));
      const remaining = Array.from({ length: sect.cage_count }, (_, i) => i + 1)
        .filter(n => !usedNums.has(n))
        .map(n => ({ cage_number: n, employee_name: '', contractor_name: '', buttons_completed: 0, raw_weight: '', coconut_type: '' as CoconutType | '', is_completed: false }));
      setCages([...loaded, ...remaining].sort((a, b) => a.cage_number - b.cage_number));
    } else {
      setCages(Array.from({ length: sect.cage_count }, (_, i) => ({
        cage_number: i + 1, employee_name: '', contractor_name: '', buttons_completed: 0, raw_weight: '', coconut_type: '', is_completed: false,
      })));
    }
    setLoading(false);
  };

  const getOrCreateSession = async (): Promise<string | null> => {
    if (session) return session.id;
    try {
      const newSession = await db.sessions.create({
        supervisor_id: appUser!.id,
        section_id: params.sectionId,
        filling_type: 'additional',
        shift,
        production_date: productionDate,
        is_submitted: false,
      });
      setSession(newSession);
      return newSession.id;
    } catch {
      return null;
    }
  };

  const activeCage = selectedCage !== null ? cages.find(c => c.cage_number === selectedCage) : null;

  const updateCageField = (field: keyof CageState, value: any) => {
    if (selectedCage === null) return;
    setCages(prev => prev.map(c => c.cage_number === selectedCage ? { ...c, [field]: value } : c));
  };

  const updateNameForCage = (cageNum: number, field: 'employee_name' | 'contractor_name', value: string) => {
    setCages(prev => prev.map(c => c.cage_number === cageNum ? { ...c, [field]: value } : c));
  };

  const handleButtonClick = (btnIndex: number) => {
    setCages(prev => prev.map(c => c.cage_number === selectedCage ? { ...c, buttons_completed: btnIndex + 1 } : c));
  };

  const calcFinalWeight = (raw: string, type: CoconutType | '') => {
    if (!raw || !type) return null;
    const rawNum = parseFloat(raw);
    if (isNaN(rawNum)) return null;
    return Math.max(0, rawNum - DEDUCTIONS[type]);
  };
  const handleSaveAllNames = async () => {
    // DB එකට යාවත්කාලීන කිරීම සඳහා ලූපයක් භාවිතා කරන්න
    for (const cage of cages) {
      if (cage.db_id) {
        await db.cageRecords.update(cage.db_id, { 
          employee_name: cage.employee_name, 
          contractor_name: cage.contractor_name 
        }).catch((err) => console.error("Failed to update name:", err));
      }
    }
    setShowNamesModal(false);
  };
  const handleSaveCage = async () => {
    if (selectedCage === null || !activeCage) return;
    const errors: string[] = [];

    // හිස් නම් සඳහා Default Values (DB Error මඟ හැරීමට)
    const finalEmployeeName = activeCage.employee_name?.trim() || 'A/B';
    const finalContractorName = activeCage.contractor_name?.trim() || '-';

    if (activeCage.buttons_completed === 0) errors.push('At least one button must be completed');
    if (!activeCage.raw_weight || isNaN(parseFloat(activeCage.raw_weight))) errors.push('Raw weight is required');
    if (!activeCage.coconut_type) errors.push('Coconut type is required');

    if (errors.length > 0) { setCageFormErrors(errors); return; }
    setCageFormErrors([]);

    const finalWeight = calcFinalWeight(activeCage.raw_weight, activeCage.coconut_type)!;
    const coconutCount = 50 * activeCage.buttons_completed;

    const sessionId = await getOrCreateSession();
    if (!sessionId) { setCageFormErrors(['Failed to create session']); return; }

    const recordData: Omit<CageRecord, 'id'> = {
      session_id: sessionId,
      cage_number: activeCage.cage_number,
      employee_name: finalEmployeeName,
      contractor_name: finalContractorName,
      raw_weight: parseFloat(activeCage.raw_weight),
      coconut_type: activeCage.coconut_type as 'Red' | 'Black' | 'Small',
      final_weight: finalWeight,
      coconut_count: coconutCount,
      buttons_completed: activeCage.buttons_completed,
      is_completed: true,
      production_date: productionDate,
      section_id: params.sectionId,
      filling_type: 'additional',
      shift,
      supervisor_id: appUser!.id,
    };

    try {
      let newDbId: string | undefined = activeCage.db_id;
      if (activeCage.db_id) {
        await db.cageRecords.update(activeCage.db_id, recordData);
      } else {
        const insertData = await db.cageRecords.create(recordData);
        if (insertData) newDbId = insertData.id;
      }

      setCages(prev => prev.map(c => c.cage_number === selectedCage ? {
        ...c, 
        employee_name: finalEmployeeName,
        contractor_name: finalContractorName,
        is_completed: true, 
        db_id: newDbId,
      } : c));
      setShowCageModal(false);
      setSelectedCage(null);
    } catch (e: any) {
      console.error("Save Cage Error:", e);
      setCageFormErrors([e.message || 'Failed to save cage to database']);
    }
  };

  const handleFinalSubmit = async () => {
    const completedCages = cages.filter(c => c.is_completed);
    if (completedCages.length === 0) { setError('At least one cage must be completed'); return; }
    if (!session) { setError('No active session'); return; }
    setSubmitting(true);
    try {
      await db.sessions.update(session.id, { is_submitted: true, submitted_at: new Date().toISOString() });
      router.push('/supervisor/sections');
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" /></div>
  );
  if (!section) return <div className="p-8 text-[#5C3A1E]">Section not found</div>;

  const completedCount = cages.filter(c => c.is_completed).length;

  return (
    <SupervisorLayout title={`${section.name} - Additional Filling`} showBack onBack={() => router.push(`/supervisor/cno/${params.sectionId}`)}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Session controls */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1.5">Production Date</label>
              <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} disabled={!!session}
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1.5">Shift</label>
              <div className="flex rounded-xl overflow-hidden border border-[#D4B896]">
                {(['day', 'night'] as const).map(s => (
                  <button key={s} onClick={() => !session && setShift(s)} disabled={!!session}
                    className={`flex-1 py-2 text-sm font-semibold capitalize transition-all disabled:cursor-not-allowed ${shift === s ? 'bg-[#5C3A1E] text-white' : 'bg-white text-[#8B5E3C] hover:bg-[#FFF0E0]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#8B5E3C]">Fill only the cages you need — each is saved individually</span>
            <span className="font-bold text-[#2D6A4F]">{completedCount} saved</span>
          </div>
        </div>

        {/* Cage grid */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-[#5C3A1E] text-sm">Select Cage to Fill</h3>
            <button 
              onClick={() => setShowNamesModal(true)}
              className="flex items-center gap-1.5 text-xs bg-[#F5E6D3] text-[#5C3A1E] px-3 py-1.5 rounded-lg font-bold hover:bg-[#E8D5C0] transition-colors border border-[#E8D5C0]"
            >
              <Users size={14} />
              Manage Names
            </button>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {cages.map(cage => (
              <motion.button
                key={cage.cage_number}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSelectedCage(cage.cage_number); setCageFormErrors([]); setShowCageModal(true); }}
                className={`relative rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all border-2 h-20 ${
                  cage.is_completed
                    ? 'bg-[#E8F5EE] border-[#2D6A4F] text-[#2D6A4F]'
                    : 'bg-[#FFF8F0] border-[#E8D5C0] text-[#5C3A1E] hover:border-[#5C3A1E]'
                }`}
              >
                {cage.is_completed && <CheckCircle size={14} className="absolute top-1.5 right-1.5 text-[#2D6A4F]" />}
                <span className="text-lg font-bold leading-none">{cage.cage_number}</span>
                <span className="text-[10px] font-semibold tracking-wide opacity-80 truncate w-full text-center mt-1">
                  {cage.employee_name || 'A/B'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Summary of completed cages */}
        {cages.some(c => c.is_completed) && (
          <div className="bg-white rounded-2xl p-4 card-shadow">
            <h3 className="font-semibold text-[#5C3A1E] mb-3 text-sm">Completed Cages</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cages.filter(c => c.is_completed).map(cage => (
                <div key={cage.cage_number} className="flex items-center gap-3 bg-[#F5FFF8] rounded-xl px-3 py-2 border border-[#C8E6D0]">
                  <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center text-sm font-bold">{cage.cage_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#3D2410] truncate">{cage.employee_name || 'A/B'}</div>
                    <div className="text-xs text-[#8B5E3C] truncate">{cage.contractor_name && cage.contractor_name !== '-' ? cage.contractor_name : 'No Contractor'} · {cage.coconut_type} · {cage.buttons_completed} btns</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#2D6A4F]">{(50 * cage.buttons_completed).toLocaleString()}</div>
                    <div className="text-[10px] text-[#8B5E3C]">coconuts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <AlertCircle size={16} />{error}
          </div>
        )}

        {cages.some(c => c.is_completed) && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleFinalSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-60 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2D6A4F, #1B4332)' }}
          >
            {submitting ? 'Submitting...' : `Submit ${completedCount} Cage${completedCount !== 1 ? 's' : ''}`}
          </motion.button>
        )}
      </div>

      {/* -------------------- 1. MANAGE NAMES MODAL -------------------- */}
      <AnimatePresence>
        {showNamesModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={() => setShowNamesModal(false)} />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-[#F5E6D3] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="bg-white px-5 pt-5 pb-3 border-b border-[#E8D5C0] flex items-center justify-between z-10 shrink-0">
                <div>
                  <h3 className="font-bold text-[#3D2410] text-lg" style={{ fontFamily: 'Georgia, serif' }}>Manage Names</h3>
                  <p className="text-xs text-[#8B5E3C]">Assign employees to all cages</p>
                </div>
                <button onClick={() => setShowNamesModal(false)} className="text-[#8B5E3C] hover:text-[#3D2410] p-1">
                  <X size={22} />
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {cages.map(cage => (
                  <div key={cage.cage_number} className="bg-white p-3.5 rounded-xl border border-[#E8D5C0] shadow-sm flex flex-col gap-2.5">
                    <div className="font-bold text-[#5C3A1E] text-sm flex items-center gap-2 border-b border-[#F5E6D3] pb-1.5">
                      <div className="w-5 h-5 rounded bg-[#5C3A1E] text-white flex items-center justify-center text-[10px]">{cage.cage_number}</div>
                      Cage {cage.cage_number}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#8B5E3C] mb-1">Employee Name</label>
                        <input type="text" value={cage.employee_name} onChange={e => updateNameForCage(cage.cage_number, 'employee_name', e.target.value)}
                          placeholder="A/B" className="w-full px-2.5 py-1.5 rounded-lg border border-[#D4B896] focus:outline-none focus:ring-1 focus:ring-[#5C3A1E] text-[#3D2410] text-xs bg-[#FAFAFA]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#8B5E3C] mb-1">Contractor (Optional)</label>
                        <input type="text" value={cage.contractor_name} onChange={e => updateNameForCage(cage.cage_number, 'contractor_name', e.target.value)}
                          placeholder="-" className="w-full px-2.5 py-1.5 rounded-lg border border-[#D4B896] focus:outline-none focus:ring-1 focus:ring-[#5C3A1E] text-[#3D2410] text-xs bg-[#FAFAFA]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>


<div className="p-4 bg-white border-t border-[#E8D5C0] shrink-0">
  <button
    onClick={handleSaveAllNames} // මෙතැන වෙනස් කරන්න
    className="w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md"
    style={{ background: 'linear-gradient(135deg, #5C3A1E, #3D2410)' }}
  >
    Save and Close
  </button>
</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- 2. MAIN CAGE MODAL -------------------- */}
      <AnimatePresence>
        {showCageModal && selectedCage !== null && activeCage && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={() => { setShowCageModal(false); setSelectedCage(null); }} />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-[#E8D5C0] flex items-center justify-between z-10">
                <div>
                  <h3 className="font-bold text-[#3D2410] text-lg" style={{ fontFamily: 'Georgia, serif' }}>Cage {selectedCage}</h3>
                  <p className="text-xs text-[#8B5E3C]">Additional Filling — fill as needed</p>
                </div>
                <button onClick={() => { setShowCageModal(false); setSelectedCage(null); }} className="text-[#8B5E3C] hover:text-[#3D2410] p-1"><X size={22} /></button>
              </div>
              <div className="p-5 space-y-5">
                
                {/* Read-Only Names Display (Inputs Removed) */}
                <div className="flex gap-4 p-3.5 bg-[#FFF8F0] rounded-xl border border-[#E8D5C0]">
                  <div className="flex-1">
                    <span className="block text-[10px] text-[#8B5E3C] uppercase font-bold tracking-wider mb-0.5">Employee</span>
                    <span className="text-sm font-bold text-[#3D2410]">
                      {activeCage.employee_name || 'A/B'}
                    </span>
                  </div>
                  <div className="flex-1 border-l border-[#E8D5C0] pl-4">
                    <span className="block text-[10px] text-[#8B5E3C] uppercase font-bold tracking-wider mb-0.5">Contractor</span>
                    <span className="text-sm font-bold text-[#3D2410]">
                      {activeCage.contractor_name || '-'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#5C3A1E]">Cage Buttons</label>
                    <span className="text-xs font-bold text-[#2D6A4F]">{activeCage.buttons_completed}/{section.buttons_per_cage}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: section.buttons_per_cage }, (_, i) => (
                      <button key={i} onClick={() => handleButtonClick(i)}
                        className={`h-9 rounded-lg text-xs font-bold transition-all border ${
                          i < activeCage.buttons_completed
                            ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white'
                            : 'bg-white border-[#D4B896] text-[#8B5E3C] hover:border-[#5C3A1E]'
                        }`}>{i + 1}</button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#8B5E3C] mt-1.5">Click the last completed button number</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5C3A1E] mb-1.5">Raw Weight (kg)</label>
                    <input type="number" step="0.01" min="0" value={activeCage.raw_weight} onChange={e => updateCageField('raw_weight', e.target.value)}
                      placeholder="e.g. 300" className="w-full px-3 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5C3A1E] mb-1.5">Coconut Type</label>
                    <select value={activeCage.coconut_type} onChange={e => updateCageField('coconut_type', e.target.value as CoconutType)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm bg-white">
                      <option value="">Select type</option>
                      <option value="Red">Red (−136 kg)</option>
                      <option value="Black">Black (−139 kg)</option>
                      <option value="Small">Small (−108 kg)</option>
                    </select>
                  </div>
                </div>

                {activeCage.raw_weight && activeCage.coconut_type && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
                    <div className="bg-[#FFF0E0] rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-[#5C3A1E]">{calcFinalWeight(activeCage.raw_weight, activeCage.coconut_type) ?? '-'} kg</div>
                      <div className="text-xs text-[#8B5E3C]">Final Weight</div>
                    </div>
                    <div className="bg-[#E8F5EE] rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-[#2D6A4F]">{(50 * activeCage.buttons_completed).toLocaleString()}</div>
                      <div className="text-xs text-[#52B788]">Coconut Count</div>
                    </div>
                  </motion.div>
                )}

                {cageFormErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                    {cageFormErrors.map((e, i) => (
                      <div key={i} className="text-red-700 text-xs flex items-center gap-1.5"><AlertCircle size={13} />{e}</div>
                    ))}
                  </div>
                )}

                <button onClick={handleSaveCage}
                  className="w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2D6A4F, #1B4332)' }}>
                  Save Cage {selectedCage}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SupervisorLayout>
  );
}