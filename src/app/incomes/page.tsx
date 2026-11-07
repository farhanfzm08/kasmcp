'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { Modal } from '@/src/components/ui/Modal';
import { formatRupiah, formatDateIndo } from '@/src/lib/format';
import { TrendingUp, PlusCircle, Search, Filter, ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Donasi Sukarela');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCategories = () => {
    fetch('/api/incomes/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error(err));
  };

  const fetchIncomes = () => {
    setLoading(true);
    let url = `/api/incomes?search=${encodeURIComponent(search)}`;
    if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setIncomes(data.incomes || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [search, selectedCategory]);

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const finalCategory = category === 'LAINNYA' ? customCategory : category;

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category: finalCategory,
          amount: Number(amount),
          date,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pemasukan');
      }

      setIsOpen(false);
      setTitle('');
      setAmount('');
      setNotes('');
      setToastMessage('Transaksi pemasukan baru berhasil dicatat!');
      fetchIncomes();
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const totalFilteredIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppLayout title="Pemasukan Kas">
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

        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
              Buku Kas Pemasukan & Donasi
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Seluruh pemasukan kas (Otomatis dari Kas Anggota maupun Donasi/Sponsorship Manual).
            </p>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Catat Pemasukan Manual
          </button>
        </div>

        {/* Mutasi & Santunan Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <a
            href="/expenses"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Pengeluaran & Santunan
          </a>
          <a
            href="/incomes"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white shadow-sm"
          >
            Pemasukan Kas & Donasi
          </a>
          <a
            href="/benefit-settings"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Jenis & Tarif Santunan
          </a>
        </div>

        {/* Total Banner & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-gradient-3 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between col-span-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Total Pemasukan Display</p>
              <h3 className="text-2xl font-black font-['Montserrat'] mt-1">{formatRupiah(totalFilteredIncome)}</h3>
              <p className="text-[11px] text-amber-100 mt-1">{incomes.length} Transaksi Terdaftar</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl md:col-span-2 flex flex-col justify-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari judul pemasukan, catatan, admin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-64 py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card p-6 rounded-3xl">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm font-medium">
              Memuat data pemasukan...
            </div>
          ) : incomes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Belum ada transaksi pemasukan yang sesuai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Judul Transaksi</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Tipe Influx</th>
                    <th className="py-3 px-4">Pencatat (Admin)</th>
                    <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                        {formatDateIndo(inc.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inc.title}</div>
                        {inc.notes && <div className="text-xs text-slate-500 mt-0.5">{inc.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {inc.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {inc.isAutoPayment ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Otomatis Kas</span>
                        ) : (
                          <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">Manual Input</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{inc.adminName}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 font-['Montserrat']">
                        + {formatRupiah(inc.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Create Income */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Input Pemasukan Manual / Donasi">
          <form onSubmit={handleCreateIncome} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Judul Pemasukan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Donasi Sukarela Hamba Allah"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="LAINNYA">+ Tambah Kategori Baru</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {category === 'LAINNYA' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Kategori Baru</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama kategori baru"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                placeholder="500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catatan Tambahan</label>
              <textarea
                rows={3}
                placeholder="Keterangan atau rincian donasi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
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
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Pemasukan'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
