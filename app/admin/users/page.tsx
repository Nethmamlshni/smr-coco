'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/AdminLayout';
import { AppUser } from '@/lib/types';
import { db } from '@/lib/db-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit2, Trash2, X, Eye, EyeOff, User, UserCheck, CircleAlert as AlertCircle } from 'lucide-react';

interface UserForm {
  username: string;
  full_name: string;
  role: 'admin' | 'supervisor';
  password: string;
  is_active: boolean;
}

const emptyForm: UserForm = { username: '', full_name: '', role: 'supervisor', password: '', is_active: true };

export default function AdminUsersPage() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || appUser?.role !== 'admin')) {
      router.replace('/login');
    }
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (appUser?.role === 'admin') fetchUsers();
  }, [appUser]);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await db.users.list();
    setUsers(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({ username: u.username, full_name: u.full_name, role: u.role, password: '', is_active: u.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.full_name.trim()) {
      setError('Username and full name are required');
      return;
    }
    if (!editUser && !form.password.trim()) {
      setError('Password is required for new users');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      if (editUser) {
        const res = await fetch(`/api/admin/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: form.full_name, role: form.role, is_active: form.is_active }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update user'); }

        if (form.password.trim()) {
          const res = await fetch('/api/admin/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: editUser.id, password: form.password }),
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || 'Failed to update password');
          }
        }
      } else {
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username.trim(), full_name: form.full_name.trim(), role: form.role, password: form.password }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to create user');
        }
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setDeleteConfirm(null);
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) fetchUsers();
  };

  if (authLoading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2410]" style={{ fontFamily: 'Georgia, serif' }}>User Management</h1>
            <p className="text-[#8B5E3C] text-sm mt-0.5">Manage admin and supervisor accounts</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#5C3A1E] hover:bg-[#3D2410] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-md"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>

        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FFF0E0] border-b border-[#E8D5C0]">
                    {['User', 'Username', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[#5C3A1E] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E6D3]">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-[#FFFAF5] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: u.role === 'admin' ? '#5C3A1E' : '#2D6A4F' }}>
                            {u.full_name?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#3D2410]">{u.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#5C3A1E] font-mono font-medium">{u.username}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Supervisor'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#8B5E3C] text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-[#5C3A1E] hover:bg-[#FFF0E0] transition-colors">
                            <Edit2 size={16} />
                          </button>
                          {u.id !== appUser?.id && (
                            <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[#8B5E3C]">
                  <User size={40} className="opacity-30 mb-3" />
                  <p className="font-medium">No users found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#3D2410]" style={{ fontFamily: 'Georgia, serif' }}>
                  {editUser ? 'Edit User' : 'Create New User'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-[#8B5E3C] hover:text-[#3D2410] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="Enter username"
                    disabled={!!editUser}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm disabled:bg-gray-50 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'supervisor' }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm bg-white"
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5C3A1E] mb-1.5">
                    Password {editUser && <span className="text-[#8B5E3C] font-normal">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={editUser ? 'Enter new password' : 'Enter password'}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-[#D4B896] focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] text-[#3D2410] text-sm"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B5E3C]">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {editUser && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-[#2D6A4F]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <label className="text-sm text-[#5C3A1E] font-medium">Account Active</label>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[#D4B896] text-[#5C3A1E] font-semibold text-sm hover:bg-[#FFF0E0] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-[#5C3A1E] hover:bg-[#3D2410] text-white font-semibold text-sm transition-colors disabled:opacity-60">
                    {submitting ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <Trash2 className="mx-auto mb-3 text-red-500" size={36} />
              <h3 className="font-bold text-[#3D2410] text-lg mb-2">Delete User?</h3>
              <p className="text-[#8B5E3C] text-sm mb-5">This action cannot be undone. All associated data will remain.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-[#D4B896] text-[#5C3A1E] font-semibold text-sm">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
