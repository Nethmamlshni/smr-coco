'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/AdminLayout';
import { Section } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit2, X, Package, CircleAlert as AlertCircle } from 'lucide-react';

interface SectionForm {
  name: string;
  section_type: 'CNO' | 'VCO';
  cage_count: number;
  buttons_per_cage: number;
  display_order: number;
  is_active: boolean;
}

const emptyForm: SectionForm = { name: '', section_type: 'CNO', cage_count: 15, buttons_per_cage: 24, display_order: 0, is_active: true };

export default function AdminSectionsPage() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || appUser?.role !== 'admin')) router.replace('/login');
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (appUser?.role === 'admin') fetchSections();
  }, [appUser]);

  const fetchSections = async () => {
    setLoading(true);
    const data = await db.sections.list();
    setSections(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditSection(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (s: Section) => {
    setEditSection(s);
    setForm({ name: s.name, section_type: s.section_type, cage_count: s.cage_count, buttons_per_cage: s.buttons_per_cage, display_order: s.display_order, is_active: s.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Section name is required'); return; }
    setError('');
    setSubmitting(true);
    try {
      if (editSection) {
        await db.sections.update(editSection.id, { ...form, name: form.name.trim() });
      } else {
        await db.sections.create({ ...form, name: form.name.trim() });
      }
      setShowModal(false);
      fetchSections();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (s: Section) => {
    await db.sections.update(s.id, { is_active: !s.is_active });
    fetchSections();
  };

  if (authLoading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2410]" style={{ fontFamily: 'Georgia, serif' }}>Section Management</h1>
            <p className="text-[#8B5E3C] text-sm mt-0.5">Configure factory sections, cage counts, and button limits</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#5C3A1E] hover:bg-[#3D2410] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-md">
            <Plus size={18} /> Add Section
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-5 card-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.section_type === 'CNO' ? '#FFF0E0' : '#E8F5EE' }}>
                    <Package size={20} style={{ color: s.section_type === 'CNO' ? '#5C3A1E' : '#2D6A4F' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-[#5C3A1E] hover:bg-[#FFF0E0] transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => toggleActive(s)}
                      className={`relative w-10 h-5.5 rounded-full transition-colors ${s.is_active ? 'bg-[#2D6A4F]' : 'bg-gray-300'}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-[#3D2410] text-base">{s.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.section_type === 'CNO' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {s.section_type}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-[#FFF8F0] rounded-xl p-2.5">
                    <div className="text-xl font-bold text-[#5C3A1E]">{s.cage_count}</div>
                    <div className="text-xs text-[#8B5E3C]">Cages</div>
                  </div>
                  <div className="bg-[#F0F8F4] rounded-xl p-2.5">
                    <div className="text-xl font-bold text-[#2D6A4F]">{s.buttons_per_cage}</div>
                    <div className="text-xs text-[#52B788]">Buttons/Cage</div>
                  </div>
                </div>
              </motion.div>
            ))}
            {sections.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-[#8B5E3C]">
                <Package size={40} className="opacity-30 mb-3" />
                <p className="font-medium">No sections found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#3D2410]" style={{ fontFamily: 'Georgia, serif' }}>
                  {editSection ? 'Edit Section' : 'Create New Section'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-[#8B5E3C] hover:text-[#3D2410]"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Section Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Section 1" className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Section Type</label>
                  <select value={form.section_type} onChange={e => setForm(f => ({ ...f, section_type: e.target.value as 'CNO' | 'VCO' }))} className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm bg-white">
                    <option value="CNO">CNO</option>
                    <option value="VCO">VCO</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Number of Cages</label>
                    <input type="number" min={1} max={100} value={form.cage_count} onChange={e => setForm(f => ({ ...f, cage_count: parseInt(e.target.value) || 15 }))} className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Buttons per Cage</label>
                    <input type="number" min={1} max={200} value={form.buttons_per_cage} onChange={e => setForm(f => ({ ...f, buttons_per_cage: parseInt(e.target.value) || 24 }))} className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Display Order</label>
                  <input type="number" min={0} value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm" />
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[#D4B896] text-[#5C3A1E] font-semibold text-sm hover:bg-[#FFF0E0] transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-[#5C3A1E] hover:bg-[#3D2410] text-white font-semibold text-sm transition-colors disabled:opacity-60">
                    {submitting ? 'Saving...' : editSection ? 'Save Changes' : 'Create Section'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
