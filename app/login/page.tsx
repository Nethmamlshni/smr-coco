'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user && appUser) {
      if (appUser.role === 'admin') router.replace('/admin/dashboard');
      else router.replace('/supervisor/sections');
    }
  }, [user, appUser, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(username.trim(), password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #3D2410 0%, #5C3A1E 40%, #2D6A4F 100%)',
        }}
      />
      {/* Tropical overlay image */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/2647873/pexels-photo-2647873.jpeg?auto=compress&cs=tinysrgb&w=1600')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Decorative circles */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #DAA520, transparent)' }} />
      <div className="absolute bottom-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #52B788, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card */}
        <div
          className="rounded-3xl p-8 wood-texture"
          style={{
            background: 'rgba(255, 248, 240, 0.97)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 8px 20px rgba(92,58,30,0.3)',
          }}
        >
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-40 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,)'
               }}
            >
              <span className="text-4xl">
                <img src="/logo.png" alt="SMR Logo" className="w-full h-full" />
              </span>
            </motion.div>
            
            <p className="text-[#8B5E3C] mt-1 text-sm font-medium tracking-wider uppercase">
              Coconut Management System
            </p>
            <div className="h-px mt-4" style={{ background: 'linear-gradient(90deg, transparent, #B8860B, transparent)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#5C3A1E] mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5E3C]" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#D4B896] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] focus:border-transparent transition-all text-[#3D2410] placeholder-[#B8A090]"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#5C3A1E] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5E3C]" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-[#D4B896] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3A1E] focus:border-transparent transition-all text-[#3D2410] placeholder-[#B8A090]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B5E3C] hover:text-[#5C3A1E] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#8B5E3C' : 'linear-gradient(135deg, #5C3A1E, #3D2410)',
                boxShadow: '0 4px 15px rgba(92,58,30,0.4)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </motion.button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E8D5C0] text-center">
            <p className="text-xs text-[#8B5E3C]">
              Secured access for Factory Staff only
            </p>
            <div className="flex justify-center gap-4 mt-2 text-xs text-[#B8860B]">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#5C3A1E]" /> Admin
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#2D6A4F]" /> Supervisor
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
