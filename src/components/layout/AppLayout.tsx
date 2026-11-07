'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  HeartHandshake,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Sparkles,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Concise Ringkas Navigation Items
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, role: 'ADMIN' },
    { label: 'Pembayaran Kas', href: '/payments', icon: CreditCard, role: 'ADMIN' },
    { label: 'Data Anggota', href: '/members', icon: Users, role: 'ADMIN' },
    { label: 'Mutasi & Santunan', href: '/expenses', icon: HeartHandshake, role: 'ADMIN' },
    { label: 'Laporan Kas', href: '/reports', icon: FileSpreadsheet, role: 'ADMIN' },
    { label: 'Pengaturan System', href: '/settings', icon: Settings, role: 'ADMIN' },
    { label: 'Portal Anggota', href: '/user-dashboard', icon: User, role: 'ALL' },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (currentUser?.role === 'ADMIN') return true;
    return item.role === 'ALL';
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcf8ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Memuat Kas Sosial Measuring Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fcf8ff]">
      {/* Desktop Sidebar - Glassmorphism Stitch Style */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-sm fixed inset-y-0 z-30">
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-100/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#2563EB] flex items-center justify-center shadow-md text-white font-bold text-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 font-['Montserrat'] leading-tight">
              Measuring Center
            </h1>
            <p className="text-xs text-indigo-600 font-semibold">Kas Sosial App</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/expenses' && (pathname === '/incomes' || pathname === '/benefit-settings')) || (item.href === '/settings' && (pathname === '/reminders' || pathname === '/audit-logs'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 font-semibold'
                    : 'text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-100/80 m-3 bg-indigo-50/50 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-800 truncate">{currentUser?.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {currentUser?.role}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">({currentUser?.npk})</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="relative w-80 bg-white h-full flex flex-col p-6 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  MC
                </div>
                <span className="font-extrabold text-slate-900">Kas Sosial</span>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href === '/expenses' && (pathname === '/incomes' || pathname === '/benefit-settings')) || (item.href === '/settings' && (pathname === '/reminders' || pathname === '/audit-logs'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-700 hover:bg-indigo-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 font-semibold rounded-xl text-sm hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar (Logout)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-white/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-indigo-50"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 font-['Montserrat'] tracking-tight">
              {title || 'Dashboard Kas Sosial'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
