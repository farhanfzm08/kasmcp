'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { Modal } from '@/src/components/ui/Modal';
import { formatRupiah, formatDateIndo } from '@/src/lib/format';
import { HeartHandshake, PlusCircle, Search, ArrowDownRight, AlertTriangle, CheckCircle2, User, Users, Globe } from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [recipientType, setRecipientType] = useState('MEMBER'); // MEMBER, FAMILY, EXTERNAL
  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientRelationship, setRecipientRelationship] = useState('Diri Sendiri');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      const [btRes, mRes] = await Promise.all([
        fetch('/api/benefit-types'),
        fetch('/api/members?status=active'),
      ]);
      const btData = await btRes.json();
      const mData = await mRes.json();

      setBenefitTypes(btData.benefitTypes || []);
      setMembers(mData.members || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = () => {
    setLoading(true);
    fetch(`/api/expenses?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => setExpenses(data.expenses || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [search]);

  // When benefit type is selected, auto-fill default amount
  const handleSelectBenefit = (bId: string) => {
    setSelectedBenefitId(bId);
    if (bId) {
      const found = benefitTypes.find((b) => b.id === bId);
      if (found && found.defaultAmount) {
        setAmount(String(found.defaultAmount));
      }
    }
  };

  // When member is selected, auto-fill recipient name
  const handleSelectMember = (mId: string) => {
    setSelectedMemberId(mId);
    if (mId) {
      const found = members.find((m) => m.id === mId);
      if (found) {
        setRecipientName(found.name);
      }
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!selectedMemberId) {
        throw new Error('Silakan pilih anggota terlebih dahulu');
      }

      const selectedMember = members.find((m) => m.id === selectedMemberId);
      const computedRecipientName = selectedMember ? selectedMember.name : 'Anggota';
      const computedRelationship = recipientType === 'MEMBER' ? 'Diri Sendiri' : recipientRelationship;

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          benefitTypeId: selectedBenefitId || undefined,
          recipientType,
          recipientName: computedRecipientName,
          recipientRelationship: computedRelationship,
          memberId: selectedMemberId,
          amount: Number(amount),
          date,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengeluaran');
      }

      setIsOpen(false);
      setRecipientName('');
      setAmount('');
      setNotes('');
      setToastMessage('Pengeluaran/Santunan sosial berhasil dicatat!');
      fetchExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const totalFilteredExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppLayout title="Pengeluaran & Santunan">
      <div className="space-y-6">
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500 text-white font-medium text-sm shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 text-xs">
              Tutup
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Montserrat']">
                Pengeluaran & Santunan
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs">
                {expenses.length} Transaksi
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Penyaluran santunan sosial dan operasional kas
            </p>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Catat Pengeluaran</span>
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <a
            href="/expenses"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-xs"
          >
            Pengeluaran & Santunan
          </a>
          <a
            href="/incomes"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Pemasukan & Donasi
          </a>
          <a
            href="/benefit-settings"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Plafon Santunan
          </a>
        </div>

        {/* Total Banner & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between col-span-1">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pengeluaran</span>
              <h3 className="text-xl font-black font-['Montserrat'] text-slate-900 mt-1">{formatRupiah(totalFilteredExpense)}</h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">{expenses.length} transaksi</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm sm:col-span-2 flex items-center">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari penerima, jenis santunan, anggota, atau catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Memuat data pengeluaran...
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Belum ada transaksi pengeluaran atau santunan sosial.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Jenis Santunan</th>
                    <th className="py-2.5 px-3">Penerima Manfaat</th>
                    <th className="py-2.5 px-3">Hubungan</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                        {formatDateIndo(exp.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {exp.benefitTypeName || 'Pengeluaran Umum'}
                        </span>
                        {exp.notes && <div className="text-xs text-slate-500 mt-1">{exp.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{exp.recipientName}</div>
                        {exp.memberName && (
                          <div className="text-xs text-slate-400">Anggota: {exp.memberName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {exp.recipientType === 'MEMBER' ? 'Anggota Langsung' : 'Keluarga Inti'} ({exp.recipientRelationship || 'Diri Sendiri'})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{exp.adminName}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-600 font-['Montserrat']">
                        - {formatRupiah(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Create Expense */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Input Pengeluaran / Santunan Sosial">
          <form onSubmit={handleCreateExpense} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Recipient Type Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Tipe Penerima</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('MEMBER');
                    setRecipientRelationship('Diri Sendiri');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    recipientType === 'MEMBER'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Anggota Langsung
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('FAMILY');
                    if (recipientRelationship === 'Diri Sendiri') {
                      setRecipientRelationship('Anak');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    recipientType === 'FAMILY'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Keluarga Inti
                </button>
              </div>
            </div>

            {/* Member Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pilih Anggota Terkait</label>
              <select
                required
                value={selectedMemberId}
                onChange={(e) => handleSelectMember(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- Pilih Anggota --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.npk})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jenis Santunan / Biaya</label>
              <select
                value={selectedBenefitId}
                onChange={(e) => handleSelectBenefit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Pengeluaran Umum (Non-Santunan)</option>
                {benefitTypes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Std: {formatRupiah(b.defaultAmount)})
                  </option>
                ))}
              </select>
            </div>

            {/* Hubungan Keluarga Dropdown */}
            {recipientType === 'FAMILY' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hubungan Keluarga</label>
                <select
                  value={recipientRelationship}
                  onChange={(e) => setRecipientRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Anak">Anak</option>
                  <option value="Istri">Istri</option>
                  <option value="Suami">Suami</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hubungan Keluarga</label>
                <input
                  type="text"
                  readOnly
                  value="Diri Sendiri"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal Diserahkan</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Keterangan Kebutuhan</label>
              <textarea
                rows={3}
                placeholder="Rincian diagnosa / alasan santunan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan & Salurkan'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
