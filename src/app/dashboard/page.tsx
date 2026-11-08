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
  AlertCircle,
  AlertTriangle,
  MessageSquare,
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
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [bulkReminderLoading, setBulkReminderLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        setToastMessage(`Pesan pengingat rapel WhatsApp Fonnte berhasil dikirim ke ${name}`);
      } else {
        alert(data.error || 'Gagal mengirim pengingat');
      }
    } catch (err) {
      alert('Gagal mengirimkan pengingat WhatsApp');
    } finally {
      setSendingReminder(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleBulkReminder = async () => {
    if (!confirm('Kirim pengingat WhatsApp rapel ke SEMUA anggota yang BELUM MEMBAYAR kas?')) return;
    setBulkReminderLoading(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MASS' }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(
          `Berhasil memproses & mengirim pengingat WhatsApp rapel ke ${data.bulkRes?.totalSent || 0} anggota!`
        );
        fetchStats();
      } else {
        alert(data.error || 'Gagal mengirim reminder massal');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat pengiriman pengingat massal');
    } finally {
      setBulkReminderLoading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard Bulanan">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  // Max value for 6-month chart scaling
  const maxMonthValue = Math.max(
    ...(stats?.monthsData || []).map((m: any) => Math.max(m.income, m.expense)),
    100000
  );

  return (
    <AppLayout title="Dashboard Bulanan">
      <div className="space-y-8">
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500 text-white font-medium text-sm shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs underline">
              Tutup
            </button>
          </div>
        )}

        {/* Bento Grid Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Saldo Kas */}
          <div className="card-gradient-1 text-white p-6 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-100">
                  Total Saldo Kas
                </span>
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black font-['Montserrat'] tracking-tight">
                {formatRupiah(stats?.currentBalance || 0)}
              </h3>
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-indigo-100">
                <span>{stats?.activeMembersCount || 0} Anggota Aktif</span>
                <span className="font-semibold text-emerald-300">Aman & Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Card 2: Target Kas Bulan Ini */}
          <div className="card-gradient-2 text-white p-6 rounded-3xl shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <CheckCircle2 className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-100">
                  Target Kas Bulan Ini
                </span>
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black font-['Montserrat'] tracking-tight">
                {stats?.progressPercentage || 0}% Lunas
              </h3>
              {/* Progress Bar */}
              <div className="mt-3 w-full bg-black/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.progressPercentage || 0}%` }}
                ></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-emerald-100 font-medium">
                <span>{stats?.paidCount || 0} Sudah Bayar</span>
                <span>{stats?.unpaidCount || 0} Belum</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pemasukan Bulan Ini */}
          <div className="card-gradient-3 text-white p-6 rounded-3xl shadow-xl shadow-amber-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingUp className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-100">
                  Pemasukan Bulan Ini
                </span>
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black font-['Montserrat'] tracking-tight">
                {formatRupiah(stats?.incomeThisMonth || 0)}
              </h3>
              <div className="mt-4 pt-4 border-t border-white/20 text-xs text-amber-100 flex items-center justify-between">
                <span>Total Pemasukan:</span>
                <span className="font-bold">{formatRupiah(stats?.totalIncome || 0)}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Pengeluaran & Santunan */}
          <div className="card-gradient-4 text-white p-6 rounded-3xl shadow-xl shadow-pink-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingDown className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-wider uppercase text-pink-100">
                  Pengeluaran Bulan Ini
                </span>
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-white" />
                </span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black font-['Montserrat'] tracking-tight">
                {formatRupiah(stats?.expenseThisMonth || 0)}
              </h3>
              <div className="mt-4 pt-4 border-t border-white/20 text-xs text-pink-100 flex items-center justify-between">
                <span>Total Pengeluaran:</span>
                <span className="font-bold">{formatRupiah(stats?.totalExpense || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <Link
            href="/members"
            className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-white hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Anggota</p>
              <p className="text-sm font-bold text-slate-900 font-['Montserrat']">Kelola Anggota</p>
            </div>
          </Link>

          <Link
            href="/payments"
            className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-white hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Kas Bulanan</p>
              <p className="text-sm font-bold text-slate-900 font-['Montserrat']">Input Pembayaran</p>
            </div>
          </Link>

          <Link
            href="/incomes"
            className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-white hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Pemasukan</p>
              <p className="text-sm font-bold text-slate-900 font-['Montserrat']">Donasi & Hibah</p>
            </div>
          </Link>

          <Link
            href="/expenses"
            className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-white hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Pengeluaran</p>
              <p className="text-sm font-bold text-slate-900 font-['Montserrat']">Catat Santunan</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleBulkReminder}
            disabled={bulkReminderLoading || !stats?.unpaidCount}
            className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-emerald-600 hover:text-white hover:shadow-lg transition-all group cursor-pointer disabled:opacity-50 text-left border border-emerald-200/80 bg-emerald-50/40"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-white group-hover:text-emerald-600 transition-all shrink-0 shadow-sm">
              {bulkReminderLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 group-hover:text-emerald-100 font-semibold">Reminder WA</p>
              <p className="text-sm font-bold text-slate-900 group-hover:text-white font-['Montserrat']">
                {bulkReminderLoading ? 'Mengirim...' : `Kirim Massal (${stats?.unpaidCount || 0})`}
              </p>
            </div>
          </button>
        </div>

        {/* SECTION 1: TOP 5 ANGGOTA TUNGGAKAN TERBANYAK (RAPEL TERTINGGI) */}
        <div className="glass-card p-6 rounded-3xl border border-rose-200/60 bg-gradient-to-br from-white via-rose-50/20 to-white shadow-lg shadow-rose-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 font-['Montserrat']">
                    Top 5 Tunggakan Terbanyak (Rapel Tertinggi)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[11px]">
                    Perlu Follow-up
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Akumulasi tunggakan tertinggi di seluruh periode kas yang perlu diprioritaskan untuk penagihan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Seluruh Tunggakan</p>
                <p className="text-base font-black text-rose-600 font-['Montserrat']">
                  {formatRupiah(stats?.totalOverdue || 0)}
                </p>
              </div>
            </div>
          </div>

          {!stats?.topDebtors || stats.topDebtors.length === 0 ? (
            <div className="py-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-800">Tidak Ada Tunggakan Kas!</p>
              <p className="text-xs text-emerald-600 mt-1">Semua anggota disiplin dan telah melunasi seluruh kewajiban kas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-rose-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-14">Rank</th>
                    <th className="py-3 px-4">Nama Anggota</th>
                    <th className="py-3 px-4">Kontak WhatsApp</th>
                    <th className="py-3 px-4">Bulan Menunggak</th>
                    <th className="py-3 px-4">Periode Tunggakan</th>
                    <th className="py-3 px-4 text-right">Total Tagihan</th>
                    <th className="py-3 px-4 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/60 text-sm font-medium">
                  {stats.topDebtors.map((d: any, idx: number) => (
                    <tr key={d.userId} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            idx === 0
                              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                              : idx === 1
                              ? 'bg-amber-500 text-white'
                              : idx === 2
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{d.name}</div>
                        <div className="text-xs text-slate-400 font-mono">NPK: {d.npk}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        <a
                          href={`https://wa.me/${d.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-600 hover:underline flex items-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{formatPhoneDisplay(d.phone)}</span>
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-extrabold text-xs">
                          {d.unpaidMonthsCount} Bulan
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {d.unpaidPeriods?.map((p: string, pIdx: number) => (
                            <span
                              key={pIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-base font-black text-rose-600 font-['Montserrat']">
                          {formatRupiah(d.totalUnpaidAmount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSendReminder('', d.userId, d.name)}
                          disabled={sendingReminder === d.userId}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingReminder === d.userId ? 'Mengirim...' : 'Kirim WA Rapel'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 2: DUA KOLOM (GRAFIK TREN KAS & RINGKASAN SANTUNAN) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom 1 (2 span): Grafik Arus Kas 6 Bulan */}
          <div className="glass-card p-6 rounded-3xl lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Montserrat']">
                    Tren Arus Kas (6 Bulan Terakhir)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Perbandingan Pemasukan vs Pengeluaran per bulan</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-slate-600">Pengeluaran</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Visualization */}
            <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {stats?.monthsData?.map((m: any, idx: number) => {
                const incHeight = maxMonthValue > 0 ? Math.max((m.income / maxMonthValue) * 160, 4) : 4;
                const expHeight = maxMonthValue > 0 ? Math.max((m.expense / maxMonthValue) * 160, 4) : 4;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-44">
                      {/* Income Bar */}
                      <div className="w-full max-w-[20px] flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                          style={{ height: `${incHeight}px` }}
                          title={`Pemasukan: ${formatRupiah(m.income)}`}
                        ></div>
                      </div>
                      {/* Expense Bar */}
                      <div className="w-full max-w-[20px] flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                          style={{ height: `${expHeight}px` }}
                          title={`Pengeluaran: ${formatRupiah(m.expense)}`}
                        ></div>
                      </div>
                    </div>
                    {/* Month Label */}
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-indigo-600 transition-colors uppercase">
                      {m.monthName}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>*Tinggi bar menunjukkan perbandingan volume mutasi kas bulanan.</span>
              <Link href="/reports" className="text-indigo-600 hover:underline font-bold">
                Buka Detail Laporan →
              </Link>
            </div>
          </div>

          {/* Kolom 2 (1 span): Ringkasan Penyaluran Santunan */}
          <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Montserrat']">
                    Penyaluran Santunan
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Realisasi santunan untuk anggota & keluarga</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20 mb-4">
                <p className="text-xs font-semibold text-pink-100 uppercase">Total Santunan Tersalurkan</p>
                <h4 className="text-2xl font-black mt-1 font-['Montserrat']">
                  {formatRupiah(stats?.benefitSummary?.totalAmount || 0)}
                </h4>
                <div className="mt-2 text-xs text-pink-100 font-medium flex items-center justify-between border-t border-white/20 pt-2">
                  <span>Jumlah Klaim Santunan</span>
                  <strong className="text-white text-sm">{stats?.benefitSummary?.totalClaims || 0} Kasus</strong>
                </div>
              </div>

              {/* Breakdown Santunan List */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rincian Per Kategori:</p>
                {!stats?.benefitSummary?.breakdown || stats.benefitSummary.breakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada pengeluaran santunan tercatat.</p>
                ) : (
                  stats.benefitSummary.breakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{item.count} penerima manfaat</p>
                      </div>
                      <span className="font-extrabold text-slate-900">{formatRupiah(item.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <Link
                href="/expenses"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center block transition-colors"
              >
                + Catat Santunan Baru
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 3: ANGGOTA BELUM BAYAR PERIODE BERJALAN */}
        <div className="glass-card p-6 rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Montserrat'] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>Anggota Belum Bayar Periode Berjalan ({stats?.unpaidMembers?.length || 0})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Daftar anggota yang belum melunasi kewajiban kas untuk periode {stats?.currentPeriod}.
              </p>
            </div>
            <Link
              href="/payments"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Lihat Semua Pembayaran →
            </Link>
          </div>

          {!stats?.unpaidMembers || stats.unpaidMembers.length === 0 ? (
            <div className="py-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-800">Luar Biasa! Semua anggota telah lunas kas.</p>
              <p className="text-xs text-emerald-600 mt-1">Tidak ada tunggakan kas pada periode ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Anggota (NPK)</th>
                    <th className="py-3 px-4">No. WhatsApp</th>
                    <th className="py-3 px-4">Jatuh Tempo</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Quick Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {stats.unpaidMembers.map((m: any) => (
                    <tr key={m.obligationId} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-400 font-mono">NPK: {m.npk}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{m.phone}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{formatDateIndo(m.dueDate)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{formatRupiah(m.amount)}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSendReminder(m.obligationId, m.userId, m.name)}
                          disabled={sendingReminder === (m.userId || m.obligationId)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          {sendingReminder === (m.userId || m.obligationId) ? 'Mengirim...' : 'Kirim WA'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 4: TRANSAKSI KEUANGAN TERBARU */}
        <div className="glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Montserrat']">
                Transaksi Keuangan Terbaru
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Catatan mutasi pemasukan dan pengeluaran kas terkini.
              </p>
            </div>
            <Link
              href="/reports"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Buka Laporan Kas →
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.recentTransactions?.map((tx: any) => (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-white/70 border border-slate-100 flex items-center justify-between hover:bg-white transition-all shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                      tx.type === 'INCOME'
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-rose-500 shadow-md shadow-rose-500/20'
                    }`}
                  >
                    {tx.type === 'INCOME' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{tx.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{tx.category}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{formatDateIndo(tx.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-extrabold font-['Montserrat'] ${
                      tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'} {formatRupiah(tx.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Oleh: {tx.adminName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
