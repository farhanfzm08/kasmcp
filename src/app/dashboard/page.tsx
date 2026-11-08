'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { formatRupiah, formatDateIndo, formatPhoneDisplay } from '@/src/lib/format';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  HeartHandshake,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Loader2,
  PhoneCall,
  Calendar,
  Flame,
  ShieldCheck,
  BarChart3,
  Heart,
  Printer,
  Search,
  X,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePeriodFilter, setActivePeriodFilter] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [activeBottomTab, setActiveBottomTab] = useState<'UNPAID' | 'TRANSACTIONS'>('UNPAID');
  
  // Quick Actions & Modal States
  const [showQuickPayModal, setShowQuickPayModal] = useState(false);
  const [quickPaySearch, setQuickPaySearch] = useState('');
  const [processingPayId, setProcessingPayId] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [bulkReminderLoading, setBulkReminderLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const fetchStats = () => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSendReminder = async (obligationId: string, userId: string, name: string) => {
    setSendingReminder(userId || obligationId);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'INDIVIDUAL', obligationId, userId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`WA pengingat terkirim ke ${name}`);
      } else {
        alert(data.error || 'Gagal mengirim pengingat');
      }
    } catch (err) {
      alert('Gagal mengirimkan pengingat WhatsApp');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleBulkReminder = async () => {
    if (!confirm(`Kirim pengingat WhatsApp ke semua (${stats?.unpaidCount || 0}) anggota yang belum bayar?`)) return;
    setBulkReminderLoading(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MASS' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Berhasil kirim pengingat ke ${data.bulkRes?.totalSent || 0} anggota`);
        fetchStats();
      } else {
        alert(data.error || 'Gagal mengirim reminder massal');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat pengiriman pengingat massal');
    } finally {
      setBulkReminderLoading(false);
    }
  };

  const handleQuickPay = async (obligationId: string, memberName: string) => {
    if (!confirm(`Konfirmasi pembayaran kas untuk ${memberName}?`)) return;
    setProcessingPayId(obligationId);
    try {
      const res = await fetch('/api/payments/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId, notes: 'Pembayaran Cepat Dashboard' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Pembayaran ${memberName} berhasil dicatat`);
        fetchStats();
      } else {
        alert(data.error || 'Gagal memproses pembayaran');
      }
    } catch (err) {
      alert('Gagal memproses pembayaran');
    } finally {
      setProcessingPayId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center h-80 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Memuat data kas...</p>
        </div>
      </AppLayout>
    );
  }

  // Filtered values based on Period Switcher
  const isYearView = activePeriodFilter === 'YEAR';
  const displayIncome = isYearView ? stats?.yearStats?.income || 0 : stats?.incomeThisMonth || 0;
  const displayExpense = isYearView ? stats?.yearStats?.expense || 0 : stats?.expenseThisMonth || 0;
  const periodLabel = isYearView ? `Tahun ${new Date().getFullYear()}` : stats?.currentPeriod;

  // Max value for 6-month chart scaling
  const maxMonthValue = Math.max(
    ...(stats?.monthsData || []).map((m: any) => Math.max(m.income, m.expense)),
    100000
  );

  // Filter unpaid members for quick pay search
  const filteredQuickPayMembers = (stats?.unpaidMembers || []).filter((m: any) =>
    m.name.toLowerCase().includes(quickPaySearch.toLowerCase()) ||
    m.npk.toLowerCase().includes(quickPaySearch.toLowerCase())
  );

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white font-medium text-xs shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TOP BAR: Controls & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Montserrat'] tracking-tight">
                Ringkasan Kas
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold font-mono">
                {periodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Overview keuangan & kewajiban kas anggota</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Switcher Pill */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setActivePeriodFilter('MONTH')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activePeriodFilter === 'MONTH'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setActivePeriodFilter('YEAR')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activePeriodFilter === 'YEAR'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tahun Ini
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => setShowQuickPayModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Terima Bayar</span>
            </button>

            <Link
              href="/expenses"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
              <span>+ Santunan</span>
            </Link>

            <button
              onClick={handleBulkReminder}
              disabled={bulkReminderLoading || !stats?.unpaidCount}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {bulkReminderLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Blast WA ({stats?.unpaidCount || 0})</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              title="Cetak Ringkasan"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SMART ALERT BANNER (Only shows when needed) */}
        {!alertDismissed && (stats?.severeDebtorsCount > 0 || (stats?.daysUntilDue !== null && stats?.daysUntilDue <= 5)) && (
          <div className="p-3.5 px-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                {stats?.severeDebtorsCount > 0 && (
                  <span>
                    <strong>{stats.severeDebtorsCount} anggota</strong> menunggak &ge;2 bulan berturut-turut.
                  </span>
                )}
                {stats?.daysUntilDue !== null && stats.daysUntilDue <= 5 && (
                  <span>
                    Jatuh tempo kas {stats.daysUntilDue < 0 ? 'lewat ' + Math.abs(stats.daysUntilDue) + ' hari' : `dalam ${stats.daysUntilDue} hari`}.
                  </span>
                )}
                <span className="text-amber-700/80 font-normal">
                  (Runway kas saat ini aman: <strong>{stats?.runwayMonths || 0} bulan</strong>)
                </span>
              </div>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              className="text-amber-600 hover:text-amber-900 font-bold text-[11px] shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 4 CORE METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Saldo Kas */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Total Saldo Kas</span>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-indigo-200" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Montserrat'] tracking-tight mt-2">
              {formatRupiah(stats?.currentBalance || 0)}
            </h3>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-200">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Runway: <strong>{stats?.runwayMonths >= 99 ? 'Aman' : `${stats?.runwayMonths} Bln`}</strong>
              </span>
              <span>{stats?.activeMembersCount || 0} Anggota</span>
            </div>
          </div>

          {/* Card 2: Kepatuhan Iuran */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kepatuhan Iuran</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-2xl font-black font-['Montserrat'] tracking-tight text-slate-900">
                {stats?.progressPercentage || 0}%
              </h3>
              <span className="text-xs font-semibold text-slate-400">Lunas</span>
            </div>
            {/* Minimal Progress Bar */}
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${stats?.progressPercentage || 0}%` }}
              ></div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="text-emerald-600 font-bold">{stats?.paidCount || 0} Selesai</span>
              <span className="text-rose-500 font-bold">{stats?.unpaidCount || 0} Belum</span>
            </div>
          </div>

          {/* Card 3: Pemasukan */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pemasukan ({isYearView ? 'YTD' : 'Bulan Ini'})
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Montserrat'] tracking-tight text-slate-900 mt-2">
              {formatRupiah(displayIncome)}
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Total Kumulatif:</span>
              <strong className="text-slate-700">{formatRupiah(stats?.totalIncome || 0)}</strong>
            </div>
          </div>

          {/* Card 4: Pengeluaran & Santunan */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pengeluaran ({isYearView ? 'YTD' : 'Bulan Ini'})
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Montserrat'] tracking-tight text-slate-900 mt-2">
              {formatRupiah(displayExpense)}
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Santunan Disalurkan:</span>
              <strong className="text-rose-600 font-bold">{stats?.benefitSummary?.totalClaims || 0} Kasus</strong>
            </div>
          </div>
        </div>

        {/* SECTION: 2-COLUMNS (CHART & RECENT CLAIMS / SOCIAL IMPACT) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri (2 Span): Grafik Arus Kas 6 Bulan */}
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 font-['Montserrat']">Arus Kas 6 Bulan</h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                  Masuk
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                  Keluar
                </span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 pt-4 border-b border-slate-100 pb-2">
              {(stats?.monthsData || []).map((m: any, idx: number) => {
                const incomeHeight = Math.max(Math.round((m.income / maxMonthValue) * 100), 4);
                const expenseHeight = Math.max(Math.round((m.expense / maxMonthValue) * 100), 4);

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-36">
                      {/* Bar Masuk */}
                      <div
                        className="w-1/2 max-w-[18px] bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition-all relative"
                        style={{ height: `${incomeHeight}%` }}
                        title={`Masuk: ${formatRupiah(m.income)}`}
                      ></div>
                      {/* Bar Keluar */}
                      <div
                        className="w-1/2 max-w-[18px] bg-rose-400 rounded-t group-hover:bg-rose-500 transition-all relative"
                        style={{ height: `${expenseHeight}%` }}
                        title={`Keluar: ${formatRupiah(m.expense)}`}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-700 mt-1">
                      {m.monthName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Chart Footer Metrics */}
            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
              <div>
                Rasio Keuangan:{' '}
                <strong className="text-slate-800">
                  {stats?.totalIncome > stats?.totalExpense ? 'Surplus (Positif)' : 'Defisit'}
                </strong>
              </div>
              <Link href="/reports" className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1">
                Buka Laporan Lengkap <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Kolom Kanan (1 Span): Penyaluran Santunan Sosial Terkini */}
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900 font-['Montserrat']">Santunan Sosial</h3>
                </div>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  {formatRupiah(stats?.benefitSummary?.totalAmount || 0)}
                </span>
              </div>

              {/* Feed Santunan Terkini */}
              <div className="space-y-3">
                {!stats?.recentBenefitClaims || stats.recentBenefitClaims.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Belum ada penyaluran santunan tercatat.
                  </div>
                ) : (
                  stats.recentBenefitClaims.map((claim: any) => (
                    <div
                      key={claim.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 flex items-center justify-between text-xs hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                            {claim.benefitTypeName}
                          </span>
                          <span className="text-slate-400 text-[10px]">{formatDateIndo(claim.date)}</span>
                        </div>
                        <p className="font-bold text-slate-800 mt-1">{claim.recipientName}</p>
                      </div>
                      <span className="font-black text-slate-900 font-['Montserrat']">
                        {formatRupiah(claim.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                href="/benefit-settings"
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center justify-between"
              >
                <span>Kelola Plafon & Jenis Santunan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION: TOP 5 TUNGGAKAN RAPEL (MODERN RANKED LEADERBOARD) */}
        <div className="p-6 rounded-2xl bg-white border border-rose-100/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Montserrat']">
                  Top 5 Tunggakan Terbanyak (Rapel)
                </h3>
                <p className="text-[11px] text-slate-400">Prioritas penagihan akumulasi kas belum terbayar</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-medium">Total Akumulasi: </span>
              <strong className="text-sm font-black text-rose-600 font-['Montserrat']">
                {formatRupiah(stats?.totalOverdue || 0)}
              </strong>
            </div>
          </div>

          {!stats?.topDebtors || stats.topDebtors.length === 0 ? (
            <div className="py-6 text-center text-xs text-emerald-600 font-medium bg-emerald-50/50 rounded-xl">
              ✓ Seluruh anggota telah melunasi kewajiban kas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-3">Anggota</th>
                    <th className="py-2.5 px-3">Durasi</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3 text-right">Total Rapel</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {stats.topDebtors.map((d: any, idx: number) => (
                    <tr key={d.userId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                            idx === 0
                              ? 'bg-rose-500 text-white'
                              : idx === 1
                              ? 'bg-amber-500 text-white'
                              : idx === 2
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{d.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NPK {d.npk}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[11px]">
                          {d.unpaidMonthsCount} Bulan
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {d.unpaidPeriods?.map((p: string, pIdx: number) => (
                            <span key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-600 font-['Montserrat'] text-sm">
                        {formatRupiah(d.totalUnpaidAmount)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleSendReminder('', d.userId, d.name)}
                          disabled={sendingReminder === d.userId}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>{sendingReminder === d.userId ? '...' : 'WA Tagihan'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION: TABBED DATA (BELUM BAYAR BULAN INI VS TRANSAKSI TERBARU) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          {/* Tab Selector */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveBottomTab('UNPAID')}
                className={`pb-2 text-xs font-bold transition-all relative ${
                  activeBottomTab === 'UNPAID'
                    ? 'text-indigo-600 after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Belum Bayar Bulan Ini ({stats?.unpaidMembers?.length || 0})
              </button>
              <span className="text-slate-200">|</span>
              <button
                onClick={() => setActiveBottomTab('TRANSACTIONS')}
                className={`pb-2 text-xs font-bold transition-all relative ${
                  activeBottomTab === 'TRANSACTIONS'
                    ? 'text-indigo-600 after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Transaksi Kas Terbaru ({stats?.recentTransactions?.length || 0})
              </button>
            </div>

            <Link
              href={activeBottomTab === 'UNPAID' ? '/payments' : '/reports'}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* TAB CONTENT: UNPAID MEMBERS */}
          {activeBottomTab === 'UNPAID' && (
            <div>
              {!stats?.unpaidMembers || stats.unpaidMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 font-semibold bg-emerald-50/40 rounded-xl">
                  ✓ Semua anggota telah melunasi kewajiban kas untuk periode ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Anggota</th>
                        <th className="py-2.5 px-3">No. WhatsApp</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {stats.unpaidMembers.slice(0, 8).map((m: any) => (
                        <tr key={m.obligationId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">NPK {m.npk}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {formatPhoneDisplay(m.phone)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={m.status} />
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 font-['Montserrat']">
                            {formatRupiah(m.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleQuickPay(m.obligationId, m.name)}
                                disabled={processingPayId === m.obligationId}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {processingPayId === m.obligationId ? '...' : 'Bayar'}
                              </button>
                              <button
                                onClick={() => handleSendReminder(m.obligationId, m.userId, m.name)}
                                disabled={sendingReminder === (m.userId || m.obligationId)}
                                className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50 cursor-pointer"
                                title="Kirim WA Tagihan"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: RECENT TRANSACTIONS */}
          {activeBottomTab === 'TRANSACTIONS' && (
            <div>
              {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Belum ada transaksi kas terbaru.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {stats.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {formatDateIndo(tx.date)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{tx.title}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'INCOME'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {tx.type === 'INCOME' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-black font-['Montserrat'] ${
                              tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'} {formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QUICK PAY MODAL */}
        {showQuickPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900 font-['Montserrat']">
                    Terima Pembayaran Cepat
                  </h3>
                </div>
                <button
                  onClick={() => setShowQuickPayModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Member Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama anggota atau NPK..."
                  value={quickPaySearch}
                  onChange={(e) => setQuickPaySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* List Unpaid Obligations */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredQuickPayMembers.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Tidak ada anggota belum bayar yang cocok.
                  </p>
                ) : (
                  filteredQuickPayMembers.map((m: any) => (
                    <div
                      key={m.obligationId}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NPK: {m.npk}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 font-['Montserrat']">
                          {formatRupiah(m.amount)}
                        </span>
                        <button
                          onClick={() => handleQuickPay(m.obligationId, m.name)}
                          disabled={processingPayId === m.obligationId}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {processingPayId === m.obligationId ? 'Memproses...' : 'Lunasi'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowQuickPayModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
