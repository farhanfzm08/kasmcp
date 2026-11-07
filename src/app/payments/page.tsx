'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Modal } from '@/src/components/ui/Modal';
import { formatRupiah, formatDateIndo } from '@/src/lib/format';
import {
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Send,
  FileCheck,
  Banknote,
  Sparkles,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function PaymentsPage() {
  const [obligations, setObligations] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Multi-Month Payment Modal state
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const [multiUserId, setMultiUserId] = useState('');
  const [multiStartMonth, setMultiStartMonth] = useState(new Date().getMonth() + 1);
  const [multiStartYear, setMultiStartYear] = useState(new Date().getFullYear());
  const [multiCount, setMultiCount] = useState(1);
  const [multiDate, setMultiDate] = useState(new Date().toISOString().split('T')[0]);
  const [multiNotes, setMultiNotes] = useState('Pelunasan sekaligus paket kas sosial');
  const [submittingMulti, setSubmittingMulti] = useState(false);
  const [multiError, setMultiError] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [periodsLoaded, setPeriodsLoaded] = useState(false);

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data.settingsObj || {}))
      .catch((err) => console.error(err));
  };

  const fetchMembers = () => {
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch((err) => console.error(err));
  };

  const fetchPeriods = () => {
    fetch('/api/cash-periods')
      .then((res) => res.json())
      .then((data) => {
        const fetchedPeriods = data.periods || [];
        setPeriods(fetchedPeriods);
        const now = new Date();
        const current = fetchedPeriods.find(
          (p: any) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
        );
        setSelectedPeriodId(current ? current.id : (fetchedPeriods[0]?.id || ''));
        setPeriodsLoaded(true);
      })
      .catch((err) => console.error(err));
  };

  const fetchObligations = () => {
    if (!periodsLoaded) return;
    setLoading(true);
    let url = `/api/payments?search=${encodeURIComponent(search)}`;

    if (selectedPeriodId && selectedPeriodId !== 'ALL') {
      url += `&periodId=${selectedPeriodId}`;
    }

    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => setObligations(data.obligations || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
    fetchPeriods();
    fetchMembers();
  }, []);

  useEffect(() => {
    if (!periodsLoaded) return;

    const controller = new AbortController();
    setLoading(true);

    let url = `/api/payments?search=${encodeURIComponent(search)}`;

    if (selectedPeriodId && selectedPeriodId !== 'ALL') {
      url += `&periodId=${selectedPeriodId}`;
    }

    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setObligations(data.obligations || []))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedPeriodId, statusFilter, search, periodsLoaded]);

  const defaultMonthlyAmount = Number(settings['DEFAULT_MONTHLY_AMOUNT'] || 20000);

  // Direct 1-Click Payment without modal confirmation
  const handleDirectMarkPaid = async (ob: any) => {
    setProcessingId(ob.id);
    try {
      const res = await fetch('/api/payments/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obligationId: ob.id,
          paymentDate: new Date().toISOString().split('T')[0],
          notes: 'Verifikasi Lunas (1-Click Direct)',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menandai lunas');
      }

      setToastMessage(
        `Pembayaran ${ob.user?.name} (${formatRupiah(ob.amount)}) LUNAS & Kwitansi WA Fonnte Terkirim!`
      );
      fetchObligations();
      fetchPeriods();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setProcessingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Confirm Multi-Month Payment
  const handleConfirmMultiPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setMultiError('');

    if (multiCount < 1 || multiCount > 12) {
      setMultiError('Jumlah bulan harus antara 1 sampai 12 bulan.');
      return;
    }

    setSubmittingMulti(true);

    try {
      const res = await fetch('/api/payments/multi-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: multiUserId,
          startMonth: Number(multiStartMonth),
          startYear: Number(multiStartYear),
          monthsCount: Number(multiCount),
          paymentDate: multiDate,
          notes: multiNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pelunasan multi-bulan');
      }

      setIsMultiPayOpen(false);
      setToastMessage(`${data.message} - Kwitansi WA Fonnte Terkirim!`);
      fetchObligations();
      fetchPeriods();
    } catch (err: any) {
      setMultiError(err.message);
    } finally {
      setSubmittingMulti(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Send Rapel WhatsApp Reminder
  const handleSendReminder = async (obligationId: string, name: string) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'INDIVIDUAL', obligationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(`Pesan Reminder Rapel WhatsApp Fonnte berhasil dikirim ke ${name}`);
      } else {
        alert(data.error || 'Gagal mengirim reminder WhatsApp');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const selectedPeriodInfo = periods.find((p) => p.id === selectedPeriodId) || periods[0];
  const paidList = obligations.filter((o) => o.status === 'SUDAH_BAYAR');
  const totalCount = obligations.length || members.length || 1;
  const paidCount = paidList.length;
  const progressPercent = Math.min(Math.round((paidCount / (totalCount || 1)) * 100), 100);
  const totalMoneyCollected = paidList.reduce((acc, curr) => acc + (curr.amount || defaultMonthlyAmount), 0);

  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <AppLayout title="Pembayaran Kas Bulanan">
      <div className="space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500 text-white font-medium text-sm shadow-xl flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 text-xs">
              Tutup
            </button>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: PERIODE AKTIF */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between relative">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">PERIODE AKTIF</p>
              <h3 className="text-2xl font-black text-slate-900 font-['Montserrat'] mt-3">
                {selectedPeriodId === 'ALL'
                  ? 'Semua Periode'
                  : selectedPeriodInfo?.title
                  ? selectedPeriodInfo.title.replace('Kas Sosial ', '')
                  : 'September 2026'}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Status data saat ini</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: ANGGOTA LUNAS */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between relative">
            <div className="w-full pr-4">
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ANGGOTA LUNAS</p>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-black text-slate-900 font-['Montserrat']">{paidCount}</span>
                <span className="text-sm font-bold text-slate-400 font-mono">/ {totalCount}</span>
              </div>
              <div className="w-full bg-emerald-100/60 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: UANG TERKUMPUL */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between relative">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">UANG TERKUMPUL</p>
              <h3 className="text-2xl font-black text-slate-900 font-['Montserrat'] mt-3">
                {formatRupiah(totalMoneyCollected)}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Periode ini</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Dropdown 1: Bulan Periode */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-900 focus-within:ring-2 focus-within:ring-emerald-500">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 cursor-pointer pr-2"
                >
                  <option value="ALL">Semua Periode</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title ? p.title.replace('Kas Sosial ', '') : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Dropdown 2: Filter Status */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-900 focus-within:ring-2 focus-within:ring-emerald-500">
                <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 cursor-pointer pr-2"
                >
                  <option value="">Semua Status</option>
                  <option value="BELUM_BAYAR">Belum Bayar</option>
                  <option value="SUDAH_BAYAR">Sudah Lunas</option>
                  <option value="TERLAMBAT">Terlambat</option>
                </select>
              </div>
            </div>

            {/* Multi-Pay Quick Action */}
            <button
              onClick={() => setIsMultiPayOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 ml-auto md:ml-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Bayar Sekaligus
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50/30 border border-emerald-100/80 rounded-2xl text-xs font-medium focus-within:ring-2 focus-within:ring-emerald-500">
              <Search className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="text"
                placeholder="Cari nama anggota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Obligations Data Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium text-sm">
              Memuat data tagihan kas...
            </div>
          ) : obligations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-medium">
              Tidak ada data tagihan kas ditemukan untuk filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Anggota (NPK)</th>
                    <th className="py-3 px-4">Jatuh Tempo</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Detail Pelunasan</th>
                    <th className="py-3 px-4 text-right">Aksi Direct Pay / WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {obligations.map((ob) => (
                    <tr key={ob.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-emerald-800 text-xs">
                        {ob.cashPeriod?.title ? ob.cashPeriod.title.replace('Kas Sosial ', '') : ''}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{ob.user?.name}</div>
                        <div className="text-xs text-slate-400 font-mono">NPK: {ob.user?.npk}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{formatDateIndo(ob.dueDate)}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{formatRupiah(ob.amount)}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ob.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {ob.status === 'SUDAH_BAYAR' ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              Lunas: {formatDateIndo(ob.paidAt)}
                            </span>
                            <div className="text-[10px] text-slate-400">Verifikator: {ob.adminName || 'Admin'}</div>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold">Belum Setor</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ob.status !== 'SUDAH_BAYAR' ? (
                            <>
                              {/* Direct 1-Click Payment Button */}
                              <button
                                onClick={() => handleDirectMarkPaid(ob)}
                                disabled={processingId === ob.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                {processingId === ob.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileCheck className="w-3.5 h-3.5" />
                                )}
                                Tandai Lunas
                              </button>
                              <button
                                onClick={() => handleSendReminder(ob.id, ob.user?.name)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors"
                                title="Kirim Reminder WA Rapel"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terverifikasi
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Multi-Month Payment (Manual 1 - 12 Bulan) */}
        <Modal isOpen={isMultiPayOpen} onClose={() => setIsMultiPayOpen(false)} title="Pelunasan Kas Sekaligus (Multi-Bulan)">
          <form onSubmit={handleConfirmMultiPay} className="space-y-4">
            {multiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {multiError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pilih Anggota</label>
              <select
                required
                value={multiUserId}
                onChange={(e) => setMultiUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Pilih Anggota --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.npk}) - {m.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bulan Mulai</label>
                <select
                  value={multiStartMonth}
                  onChange={(e) => setMultiStartMonth(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                >
                  {monthsIndo.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tahun Mulai</label>
                <input
                  type="number"
                  required
                  value={multiStartYear}
                  onChange={(e) => setMultiStartYear(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Manual Input for Jumlah Bulan (1 - 12 Bulan) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Jumlah Bulan (Manual 1 - 12 Bulan)
                </label>
                <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {multiCount} Bulan
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={multiCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < 1) setMultiCount(1);
                    else if (val > 12) setMultiCount(12);
                    else setMultiCount(val);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-sm font-black text-amber-900 focus:ring-2 focus:ring-amber-500"
                  placeholder="Ketik jumlah bulan (1-12)"
                />
              </div>
              
              {/* Quick Select Buttons for Convenience */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMultiCount(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                      multiCount === num
                        ? 'bg-amber-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800'
                    }`}
                  >
                    {num} Bln
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <p className="text-xs font-bold uppercase">Ringkasan Pelunasan Paket:</p>
              <p className="text-xs font-medium">
                Mulai: <strong>{monthsIndo[multiStartMonth - 1]} {multiStartYear}</strong> ({multiCount} Bulan Kedepan)
              </p>
              <p className="text-xs font-medium text-slate-600">
                Tarif Per Bulan: {formatRupiah(defaultMonthlyAmount)}
              </p>
              <p className="text-lg font-black font-['Montserrat'] text-amber-800 mt-1">
                Total Setoran ({multiCount} Bulan): {formatRupiah(multiCount * defaultMonthlyAmount)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={multiDate}
                  onChange={(e) => setMultiDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catatan</label>
                <input
                  type="text"
                  value={multiNotes}
                  onChange={(e) => setMultiNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsMultiPayOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingMulti || !multiUserId}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingMulti ? 'Memproses Multi-Pay...' : `Pelunasan ${multiCount} Bulan Sekaligus`}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
