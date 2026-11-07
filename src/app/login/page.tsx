'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, UserCheck, AlertCircle, ArrowRight, Lock, Key } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [npk, setNpk] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npk, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      if (data.user.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/user-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoNpk: string, demoPass: string) => {
    setNpk(demoNpk);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-6 relative overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 shadow-xl shadow-indigo-500/30 text-white mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-['Montserrat']">
            Kas Sosial Measuring Center
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Sistem Informasi Pengelolaan & Transparansi Kas
          </p>
        </div>

        {/* Login Glass Form Container */}
        <div className="glass-card p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Nomor Pokok Karyawan (NPK)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ADMIN01 atau 1001"
                  value={npk}
                  onChange={(e) => setNpk(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:opacity-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo Login Shortcuts */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Akun Demo Cepat
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN01', 'admin123')}
                className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin (ADMIN01)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('1001', 'user123')}
                className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Anggota (1001)
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 font-medium mt-6">
          © 2026 Kas Sosial Measuring Center • Hak Cipta Dilindungi
        </p>
      </div>
    </div>
  );
}
