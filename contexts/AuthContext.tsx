'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppUser } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(({ user }) => {
        setAppUser(user ?? null);
      })
      .catch(() => setAppUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Invalid username or password' };

    setAppUser(data.user);
    return { error: null };
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ user: appUser, appUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
