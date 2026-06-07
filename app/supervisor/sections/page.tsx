'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SupervisorLayout } from '@/components/SupervisorLayout';
import { Section } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function SupervisorSectionsPage() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showVcoMessage, setShowVcoMessage] = useState(false);
  const [cnoSections, setCnoSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'VCO' | 'CNO' | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !appUser)) router.replace('/login');
    if (!authLoading && appUser?.role === 'admin') router.replace('/admin/dashboard');
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (appUser) fetchSections();
  }, [appUser]);

  const fetchSections = async () => {
    const data = await db.sections.list(true);
    setCnoSections(data.filter(s => s.section_type === 'CNO'));
    setLoading(false);
  };

  const handleVco = () => {
    setSelectedType('VCO');
    setShowVcoMessage(true);
    setTimeout(() => {
      setShowVcoMessage(false);
      setSelectedType(null);
    }, 2500);
  };

  const handleCno = () => {
    setSelectedType('CNO');
  };

  const handleSectionSelect = (section: Section) => {
    router.push(`/supervisor/cno/${section.id}`);
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--coconut-cream)' }}>
      <div className="w-10 h-10 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <SupervisorLayout title="Select Section">
      <div className="max-w-lg mx-auto">
        {/* Welcome card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-6 text-white"
          style={{ background: 'linear-gradient(135deg, #3D2410, #5C3A1E)' }}>
          <p className="text-white/70 text-sm">Welcome back,</p>
          <h2 className="text-xl font-bold mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>{appUser?.full_name}</h2>
          <p className="text-white/60 text-xs mt-2">Select a production section to begin</p>
        </motion.div>

        {/* VCO Message overlay */}
        {showVcoMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-2xl p-8 mb-4 text-center card-shadow"
            style={{ background: 'linear-gradient(135deg, #FFF8F0, #FFF0E0)', border: '2px solid #D4B896' }}
          >
            <div className="text-5xl mb-3">🚧</div>
            <h3 className="text-xl font-bold text-[#5C3A1E]" style={{ fontFamily: 'Georgia, serif' }}>
              Ongoing section not created yet.
            </h3>
            <p className="text-[#8B5E3C] text-sm mt-2">Returning to selection page...</p>
          </motion.div>
        )}

        {!showVcoMessage && selectedType !== 'CNO' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="text-center text-[#5C3A1E] font-semibold mb-4 text-sm uppercase tracking-widest">Production Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* VCO Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleVco}
                className="rounded-2xl p-6 text-center card-shadow transition-all"
                style={{ background: 'linear-gradient(135deg, #2D6A4F, #1B4332)', color: 'white' }}
              >
                <div className="text-4xl mb-3">🌿</div>
                <div className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>VCO</div>
                <div className="text-white/70 text-xs mt-1">Virgin Coconut Oil</div>
              </motion.button>

              {/* CNO Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCno}
                className="rounded-2xl p-6 text-center card-shadow transition-all"
                style={{ background: 'linear-gradient(135deg, #5C3A1E, #3D2410)', color: 'white' }}
              >
                <div className="text-4xl mb-3">🥥</div>
                <div className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>CNO</div>
                <div className="text-white/70 text-xs mt-1">Coconut Oil</div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {selectedType === 'CNO' && !showVcoMessage && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => setSelectedType(null)}
                className="text-[#5C3A1E] hover:text-[#3D2410] font-medium text-sm flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <div className="h-px flex-1 bg-[#D4B896]" />
              <span className="text-[#5C3A1E] font-semibold text-sm uppercase tracking-wide">CNO Sections</span>
            </div>
            <div className="space-y-3">
              {cnoSections.map((section, i) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSectionSelect(section)}
                  className="w-full bg-white rounded-2xl p-5 card-shadow flex items-center justify-between group hover:border-[#5C3A1E] border-2 border-transparent transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #5C3A1E, #8B5E3C)' }}>
                      {i + 1}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#3D2410] text-base">{section.name}</div>
                      <div className="text-xs text-[#8B5E3C] mt-0.5">
                        {section.cage_count} cages · {section.buttons_per_cage} buttons/cage
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#B8A090] group-hover:text-[#5C3A1E] transition-colors" />
                </motion.button>
              ))}
              {cnoSections.length === 0 && (
                <div className="text-center py-10 text-[#8B5E3C]">
                  <p>No CNO sections available. Contact admin.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </SupervisorLayout>
  );
}
