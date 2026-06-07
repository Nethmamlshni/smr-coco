'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SupervisorLayout } from '@/components/SupervisorLayout';
import { Section } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function CnoSectionPage({ params }: { params: { sectionId: string } }) {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !appUser)) router.replace('/login');
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (params.sectionId) {
      db.sections.get(params.sectionId).then(data => {
        setSection(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [params.sectionId]);

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" /></div>
  );

  if (!section) return <div className="min-h-screen flex items-center justify-center text-[#5C3A1E]">Section not found</div>;

  return (
    <SupervisorLayout title={section.name} showBack onBack={() => router.push('/supervisor/sections')}>
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="bg-white rounded-2xl p-4 card-shadow flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, #5C3A1E, #3D2410)' }}>
              🥥
            </div>
            <div>
              <h2 className="font-bold text-[#3D2410] text-lg" style={{ fontFamily: 'Georgia, serif' }}>{section.name}</h2>
              <p className="text-[#8B5E3C] text-xs">{section.cage_count} cages · {section.buttons_per_cage} buttons/cage</p>
            </div>
          </div>
        </motion.div>

        <h3 className="text-center text-[#5C3A1E] font-semibold mb-4 text-sm uppercase tracking-widest">Select Filling Type</h3>

        <div className="space-y-4">
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/supervisor/cno/${params.sectionId}/full-filling`)}
            className="w-full bg-white rounded-2xl p-6 card-shadow flex items-center justify-between group hover:border-[#5C3A1E] border-2 border-transparent transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#FFF0E0' }}>
                🪣
              </div>
              <div className="text-left">
                <div className="font-bold text-[#3D2410] text-lg">Full Filling</div>
                <div className="text-xs text-[#8B5E3C] mt-0.5">All {section.buttons_per_cage} buttons must be completed per cage</div>
                <div className="text-xs text-[#2D6A4F] mt-1 font-medium">{section.cage_count} cages available</div>
              </div>
            </div>
            <ChevronRight size={22} className="text-[#B8A090] group-hover:text-[#5C3A1E] transition-colors" />
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/supervisor/cno/${params.sectionId}/additional-filling`)}
            className="w-full bg-white rounded-2xl p-6 card-shadow flex items-center justify-between group hover:border-[#2D6A4F] border-2 border-transparent transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#E8F5EE' }}>
                ➕
              </div>
              <div className="text-left">
                <div className="font-bold text-[#3D2410] text-lg">Additional Filling</div>
                <div className="text-xs text-[#8B5E3C] mt-0.5">Fill only required cages as needed</div>
                <div className="text-xs text-[#2D6A4F] mt-1 font-medium">Flexible cage selection</div>
              </div>
            </div>
            <ChevronRight size={22} className="text-[#B8A090] group-hover:text-[#2D6A4F] transition-colors" />
          </motion.button>
        </div>
      </div>
    </SupervisorLayout>
  );
}
