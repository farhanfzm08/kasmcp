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
        const day = now.getDate();
        let targetMonth = now.getMonth() + 1;
        let targetYear = now.getFullYear();
        if (day < 25) {
          targetMonth -= 1;
          if (targetMonth < 1) {
            targetMonth = 12;
            targetYear -= 1;
          }
        }
        const current = fetchedPeriods.find(
          (p: any) => p.month === targetMonth && p.year === targetYear
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
    <AppLayout title="Pembayaran Kas">
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white font-medium text-xs shadow-2xl flex items-center gap-3 animate-in fade-in duration-300 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Periode */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periode Terpilih</span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-['Montserrat'] mt-1">
                {selectedPeriodId === 'ALL'
                  ? 'Semua Periode'
                  : selectedPeriodInfo?.title
                  ? selectedPeriodInfo.title.replace('Kas Sosial ', '')
                  : 'Periode Aktif'}
              </h3>
              <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Siklus cut-off 25–24</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Kepatuhan */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="w-full pr-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kepatuhan Iuran</span>
                <span className="text-xs font-bold text-emerald-600">{progressPercent}%</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg sm:text-xl font-black text-slate-900 font-['Montserrat']">{paidCount}</span>
                <span className="text-xs text-slate-400">/ {totalCount} Lunas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Uang Terkumpul */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uang Terkumpul</span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-['Montserrat'] mt-1">
                {formatRupiah(totalMoneyCollected)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{paidCount} transaksi lunas</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter Dropdown 1: Bulan Periode */}
            <div className="relative">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer pr-1"
                >
                  <option value="ALL">Semua Periode</option>
                  {periods.map((p) => {
                    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                    let nextM = p.month + 1;
                    if (nextM > 12) nextM = 1;
                    const cleanTitle = p.title ? p.title.replace('Kas Sosial ', '') : '';
                    const rangeInfo = p.month ? `(25 ${monthsShort[p.month - 1]} - 24 ${monthsShort[nextM - 1]})` : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {cleanTitle} {rangeInfo}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Filter Dropdown 2: Filter Status */}
            <div className="relative">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer pr-1"
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
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ml-auto md:ml-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Bayar Sekaligus</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NPK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Obligations Data Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              Memuat data tagihan...
            </div>
          ) : obligations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium italic">
              Tidak ada data tagihan kas yang cocok dengan filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3">Anggota</th>
                    <th className="py-2.5 px-3">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Pelunasan</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {obligations.map((ob) => (
                    <tr key={ob.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-indigo-900">
                        {ob.cashPeriod?.title ? ob.cashPeriod.title.replace('Kas Sosial ', '') : ''}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{ob.user?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NPK {ob.user?.npk}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDateIndo(ob.dueDate)}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 font-['Montserrat']">
                        {formatRupiah(ob.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={ob.status} />
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {ob.status === 'SUDAH_BAYAR' ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              {formatDateIndo(ob.paidAt)}
                            </span>
                            <div className="text-[10px] text-slate-400">{ob.adminName || 'Admin'}</div>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-semibold">Belum</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ob.status !== 'SUDAH_BAYAR' ? (
                            <>
                              <button
                                onClick={() => handleDirectMarkPaid(ob)}
                                disabled={processingId === ob.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              >
                                {processingId === ob.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <FileCheck className="w-3 h-3" />
                                )}
                                <span>Lunasi</span>
                              </button>
                              <button
                                onClick={() => handleSendReminder(ob.id, ob.user?.name)}
                                className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                title="Kirim WA Tagihan"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Lunas
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
