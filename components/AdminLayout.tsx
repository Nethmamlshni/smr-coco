'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Settings, LogOut, Menu, X, ChevronRight, ChartBar as BarChart3, Package, UserCog } from 'lucide-react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { appUser, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Reports', href: '/admin/reports', icon: <BarChart3 size={20} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'Sections', href: '/admin/sections', icon: <Package size={20} /> },
  ];

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--coconut-cream)' }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        className="fixed left-0 top-0 bottom-0 w-64 z-30 lg:static lg:translate-x-0 lg:block"
        style={{ background: 'linear-gradient(180deg, #3D2410 0%, #5C3A1E 60%, #2D6A4F 100%)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,255)' }}>
               <img src="/logo.png" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'Georgia, serif' }}>SMR </h2>
                <p className="text-white/50 text-xs uppercase tracking-wider">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-[#5C3A1E]" style={{ background: '#DAA520' }}>
                {appUser?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{appUser?.full_name || appUser?.username}</p>
                <p className="text-[#DAA520] text-xs font-medium uppercase tracking-wide">Administrator</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-150 group text-sm font-medium"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-white/60 group-hover:text-[#DAA520] transition-colors">{item.icon}</span>
                {item.label}
                <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-red-500/20 transition-all duration-150 text-sm font-medium"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-[#E8D5C0] bg-white/90 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#5C3A1E] hover:text-[#3D2410] transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1">
            <p className="text-sm text-[#8B5E3C]">Welcome back, <span className="font-semibold text-[#5C3A1E]">{appUser?.full_name || appUser?.username}</span></p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide">
            <UserCog size={14} />
            Admin
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
