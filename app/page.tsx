'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !appUser) {
      router.replace('/login');
    } else if (appUser.role === 'admin') {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/supervisor/sections');
    }
  }, [user, appUser, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--coconut-cream)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#5C3A1E] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#5C3A1E] font-semibold">Loading CocoFactory...</p>
      </div>
    </div>
  );
}
