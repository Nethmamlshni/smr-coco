'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronLeft } from 'lucide-react';

interface SupervisorLayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export function SupervisorLayout({ children, title, onBack, showBack }: SupervisorLayoutProps) {
  const { appUser, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--coconut-cream)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #3D2410, #5C3A1E)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
      >
        {showBack && (
          <button
            onClick={onBack || (() => router.back())}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-2xl">🥥</span>
          <div>
            <h1 className="text-white font-bold text-base leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              {title || 'CocoFactory'}
            </h1>
            <p className="text-white/50 text-xs">{appUser?.full_name || appUser?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide border border-green-500/30">
            Supervisor
          </div>
          <button
            onClick={handleLogout}
            className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
