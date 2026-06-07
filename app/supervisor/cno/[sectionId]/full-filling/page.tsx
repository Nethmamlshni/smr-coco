'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SupervisorLayout } from '@/components/SupervisorLayout';
import { Section, ProductionSession, CageRecord } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleCheck as CheckCircle, ChevronRight, X, CircleAlert as AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type CoconutType = 'Red' | 'Black' | 'Small';

const DEDUCTIONS: Record<CoconutType, number> = { Small: 108, Red: 136, Black: 139 };

interface CageState {
  cage_number: number;
  buttons_completed: number;
  raw_weight: string;
  coconut_type: CoconutType | '';
  is_completed: boolean;
  db_id?: string;
}

export default function FullFillingPage({ params }: { params: { sectionId: string } }) {
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
      filling_type: 'full',
      is_submitted: false,
    });
    const existingSession = sessions[0] || null;

    if (existingSession) {
      setSession(existingSession);
      setShift(existingSession.shift as 'day' | 'night');
      setProductionDate(existingSession.production_date);
      const existingCages = await db.cageRecords.list({ session_id: existingSession.id });

      const cageMap: Record<number, CageRecord> = {};
      existingCages.forEach(r => { cageMap[r.cage_number] = r; });

      setCages(Array.from({ length: sect.cage_count }, (_, i) => {
        const n = i + 1;
        const existing = cageMap[n];
        return {
          cage_number: n,
          buttons_completed: existing?.buttons_completed || 0,
          raw_weight: existing?.raw_weight?.toString() || '',
          coconut_type: (existing?.coconut_type as CoconutType | '') || '',
          is_completed: existing?.is_completed || false,
          db_id: existing?.id,
        };
      }));
    } else {
      setCages(Array.from({ length: sect.cage_count }, (_, i) => ({
        cage_number: i + 1,
        buttons_completed: 0, 
        raw_weight: '', 
        coconut_type: '', 
        is_completed: false,
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
        filling_type: 'full',
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

  const activeCage = selectedCage !== null ? cages[selectedCage - 1] : null;

  const updateCageField = (field: keyof CageState, value: any) => {
    if (selectedCage === null) return;
    setCages(prev => prev.map(c => c.cage_number === selectedCage ? { ...c, [field]: value } : c));
  };

  const handleButtonClick = (btnIndex: number) => {
    if (selectedCage === null) return;
    const cage = cages[selectedCage - 1];
    const newCount = btnIndex + 1;
    setCages(prev => prev.map(c => c.cage_number === selectedCage ? { ...c, buttons_completed: newCount } : c));
  };

  const calcFinalWeight = (raw: string, type: CoconutType | '') => {
    if (!raw || !type) return null;
    const rawNum = parseFloat(raw);
    if (isNaN(rawNum)) return null;
    return Math.max(0, rawNum - DEDUCTIONS[type]);
  };

  const handleSaveCage = async () => {
    if (selectedCage === null) return;
    const cage = cages[selectedCage - 1];
    const errors: string[] = [];

    if (cage.buttons_completed === 0) errors.push('At least one button must be completed'); 
    if (!cage.raw_weight || isNaN(parseFloat(cage.raw_weight))) errors.push('Raw weight is required');
    if (!cage.coconut_type) errors.push('Coconut type is required');

    if (errors.length > 0) { setCageFormErrors(errors); return; }
    setCageFormErrors([]);

    const finalWeight = calcFinalWeight(cage.raw_weight, cage.coconut_type)!;
    const coconutCount = 50 * cage.buttons_completed; 

    const sessionId = await getOrCreateSession();
    if (!sessionId) { setCageFormErrors(['Failed to create session']); return; }

    const recordData: Omit<CageRecord, 'id'> = {
      session_id: sessionId,
      cage_number: cage.cage_number,
      employee_name: 'A/B', // DB Error මඟහැරීමට default value එකක් ලබාදීම
      contractor_name: '-', // DB Error මඟහැරීමට default value එකක් ලබාදීම
      raw_weight: parseFloat(cage.raw_weight),
      coconut_type: cage.coconut_type as 'Red' | 'Black' | 'Small',
      final_weight: finalWeight,
      coconut_count: coconutCount,
      buttons_completed: cage.buttons_completed,
      is_completed: true,
      production_date: productionDate,
      section_id: params.sectionId,
      filling_type: 'full',
      shift,
      supervisor_id: appUser!.id,
    };

    try {
      let newDbId: string | undefined = cage.db_id;
      if (cage.db_id) {
        await db.cageRecords.update(cage.db_id, { ...recordData });
      } else {
        const insertData = await db.cageRecords.create(recordData);
        if (insertData) newDbId = insertData.id;
      }

      setCages(prev => prev.map(c => c.cage_number === selectedCage ? {
        ...c, 
        is_completed: true, 
        final_weight: finalWeight,
        db_id: newDbId,
      } : c));
      setShowCageModal(false);
      setSelectedCage(null);

    } catch (e: any) {
      console.error("Save Cage Error:", e);
      setCageFormErrors([e.message || 'Failed to save cage to database']);
    }
  };

  const completedCount = cages.filter(c => c.is_completed).length;

  const handleFinalSubmit = async () => {
    if (completedCount === 0) { 
      setError('At least one cage must be completed before submitting'); 
      return; 
    }
    if (!productionDate) { setError('Please select a production date'); return; }
    setSubmitting(true);
    try {
      const sessionId = session?.id;
      if (!sessionId) throw new Error('No active session');
      await db.sessions.update(sessionId, { is_submitted: true, submitted_at: new Date().toISOString() });
      router.push('/supervisor/sections');
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openCageModal = (cageNum: number) => {
    setSelectedCage(cageNum);
    setCageFormErrors([]);
    setShowCageModal(true);
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" /></div>
  );

  if (!section) return <div className="p-8 text-[#5C3A1E]">Section not found</div>;

  return (
    <SupervisorLayout title={`${section.name} - Full Filling`} showBack onBack={() => router.push(`/supervisor/cno/${params.sectionId}`)}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Session controls */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8B5E3C] mb-1.5">Production Date</label>
              <input
                type="date"
                value={productionDate}
                onChange={e => setProductionDate(e.target.value)}
                disabled={!!session}
                className="w-full px-3 py-2 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm disabled:opacity-60"
              />
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
          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[#8B5E3C] mb-1.5">
              <span>Progress</span>
              <span className="font-semibold text-[#5C3A1E]">{completedCount}/{section.cage_count} cages</span>
            </div>
            <div className="h-2 bg-[#F5E6D3] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #5C3A1E, #2D6A4F)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / section.cage_count) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>

        {/* Cage grid */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-[#5C3A1E] text-sm">{section.cage_count} Cages</h3>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {cages.map(cage => (
              <motion.button
                key={cage.cage_number}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openCageModal(cage.cage_number)}
                className={`relative rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all border-2 h-20 ${
                  cage.is_completed
                    ? 'bg-[#E8F5EE] border-[#2D6A4F] text-[#2D6A4F]'
                    : 'bg-[#FFF8F0] border-[#E8D5C0] text-[#5C3A1E] hover:border-[#5C3A1E]'
                }`}
              >
                {cage.is_completed && (
                  <CheckCircle size={14} className="absolute top-1.5 right-1.5 text-[#2D6A4F]" />
                )}
                <span className="text-lg font-bold leading-none">{cage.cage_number}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Completed summary */}
        {completedCount > 0 && (
          <div className="bg-white rounded-2xl p-4 card-shadow">
            <h3 className="font-semibold text-[#5C3A1E] mb-3 text-sm">Completed Cages Summary</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cages.filter(c => c.is_completed).map(cage => (
                <div key={cage.cage_number} className="flex items-center gap-3 bg-[#F5FFF8] rounded-xl px-3 py-2 border border-[#C8E6D0]">
                  <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center text-sm font-bold">{cage.cage_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#3D2410] truncate">Type: {cage.coconut_type}</div>
                    <div className="text-xs text-[#8B5E3C] truncate">Raw Weight: {cage.raw_weight}kg</div>
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

        {completedCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleFinalSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-60 shadow-lg mt-4"
            style={{ background: 'linear-gradient(135deg, #2D6A4F, #1B4332)' }}
          >
            {submitting ? 'Submitting...' : `Submit ${completedCount} Completed Cages`}
          </motion.button>
        )}
      </div>

      {/* -------------------- MAIN CAGE MODAL -------------------- */}
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
                  <p className="text-xs text-[#8B5E3C]">Up to {section.buttons_per_cage} buttons</p>
                </div>
                <button onClick={() => { setShowCageModal(false); setSelectedCage(null); }} className="text-[#8B5E3C] hover:text-[#3D2410] p-1">
                  <X size={22} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Buttons grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#5C3A1E]">Cage Buttons</label>
                    <span className="text-xs font-bold text-[#2D6A4F]">{activeCage.buttons_completed}/{section.buttons_per_cage} completed</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: section.buttons_per_cage }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => handleButtonClick(i)}
                        className={`h-9 rounded-lg text-xs font-bold transition-all border ${
                          i < activeCage.buttons_completed
                            ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white'
                            : 'bg-white border-[#D4B896] text-[#8B5E3C] hover:border-[#5C3A1E] hover:text-[#5C3A1E]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#8B5E3C] mt-1.5">Click the last completed button number</p>
                </div>

                {/* Weight & type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5C3A1E] mb-1.5">Raw Weight (kg)</label>
                    <input type="number" step="0.01" min="0" value={activeCage.raw_weight} onChange={e => updateCageField('raw_weight', e.target.value)}
                      placeholder="e.g. 580" className="w-full px-3 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
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

                {/* Calculated results */}
                {activeCage.raw_weight && activeCage.coconut_type && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-3">
                    <div className="bg-[#FFF0E0] rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-[#5C3A1E]">
                        {calcFinalWeight(activeCage.raw_weight, activeCage.coconut_type) ?? '-'} kg
                      </div>
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
                      <div key={i} className="text-red-700 text-xs flex items-center gap-1.5">
                        <AlertCircle size={13} />{e}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSaveCage}
                  className="w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #5C3A1E, #3D2410)' }}
                >
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