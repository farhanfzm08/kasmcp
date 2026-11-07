'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { Modal } from '@/src/components/ui/Modal';
import { formatRupiah } from '@/src/lib/format';
import { HeartHandshake, Plus, Edit3, Trash2, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

export default function BenefitSettingsPage() {
  const [benefitTypes, setBenefitTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [rules, setRules] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchBenefits = () => {
    setLoading(true);
    fetch('/api/benefit-types')
      .then((res) => res.json())
      .then((data) => setBenefitTypes(data.benefitTypes || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBenefits();
  }, []);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setSelectedId(null);
    setName('');
    setDescription('');
    setDefaultAmount('');
    setRules('');
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setIsEdit(true);
    setSelectedId(b.id);
    setName(b.name);
    setDescription(b.description || '');
    setDefaultAmount(String(b.defaultAmount));
    setRules(b.rules || '');
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const url = isEdit ? `/api/benefit-types/${selectedId}` : '/api/benefit-types';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          defaultAmount: Number(defaultAmount),
          rules,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan jenis santunan');
      }

      setIsOpen(false);
      setToastMessage(isEdit ? 'Jenis santunan diperbarui!' : 'Jenis santunan baru ditambahkan!');
      fetchBenefits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDelete = async (b: any) => {
    if (!confirm(`Hapus jenis santunan "${b.name}"?`)) return;
    try {
      const res = await fetch(`/api/benefit-types/${b.id}`, { method: 'DELETE' });
      if (res.ok) {
        setToastMessage('Jenis santunan berhasil dihapus');
        fetchBenefits();
      } else {
        alert('Gagal menghapus jenis santunan');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  return (
    <AppLayout title="Pengaturan Santunan Sosial">
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
              Master Jenis Santunan Sosial
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Atur daftar jenis santunan duka/sakit, nominal kelayakan baku, dan persyaratannya.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Jenis Santunan
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Pemasukan Kas & Donasi
          </a>
          <a
            href="/benefit-settings"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm"
          >
            Jenis & Tarif Santunan
          </a>
        </div>

        {/* Grid Cards */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-medium">
            Memuat data jenis santunan...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefitTypes.map((b) => (
              <div key={b.id} className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-3">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 font-['Montserrat']">{b.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{b.description || 'Tidak ada deskripsi.'}</p>

                  <div className="mt-4 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 uppercase">Nominal Default:</span>
                    <span className="text-base font-extrabold text-indigo-900 font-['Montserrat']">
                      {formatRupiah(b.defaultAmount)}
                    </span>
                  </div>

                  {b.rules && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-1">
                      <div className="font-bold text-slate-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Syarat & Ketentuan:
                      </div>
                      <p className="text-[11px] leading-relaxed">{b.rules}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={isEdit ? 'Edit Jenis Santunan' : 'Tambah Jenis Santunan Baru'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Jenis Santunan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Santunan Kelahiran Putra/Putri"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nominal Standard (Rp)</label>
              <input
                type="number"
                required
                placeholder="500000"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deskripsi Singkat</label>
              <input
                type="text"
                placeholder="Penjelasan peruntukan santunan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Syarat & Berkas Verifikasi</label>
              <textarea
                rows={3}
                placeholder="Contoh: Surat keterangan dokter / akta..."
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
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
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Jenis Santunan'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
