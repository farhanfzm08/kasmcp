'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { Save, CheckCircle2, MessageSquare, Globe, DollarSign, Send, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Test WA State
  const [testPhone, setTestPhone] = useState('');
  const [testingWa, setTestingWa] = useState(false);
  const [testWaResult, setTestWaResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const fetchSettings = () => {
    setLoading(true);
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data.settingsObj || {}))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }

      setToastMessage('Pengaturan sistem & Token Fonnte berhasil disimpan!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleTestWaConnection = async () => {
    if (!testPhone) {
      alert('Masukkan nomor WhatsApp penguji terlebih dahulu (contoh: 081234567890)');
      return;
    }

    setTestingWa(true);
    setTestWaResult(null);

    try {
      const res = await fetch('/api/settings/test-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPhone: testPhone }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestWaResult({ success: true, message: data.message });
      } else {
        setTestWaResult({ success: false, error: data.error || 'Gagal melakukan tes koneksi WA' });
      }
    } catch (err: any) {
      setTestWaResult({ success: false, error: err.message || 'Terjadi kesalahan jaringan' });
    } finally {
      setTestingWa(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Pengaturan Sistem">
        <div className="py-12 text-center text-slate-500 font-medium text-sm">
          Memuat konfigurasi sistem...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Pengaturan Sistem & Notifikasi">
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
                Konfigurasi Master Kas & Integration API
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kelola parameter nominal kas, tanggal jatuh tempo, dan API Gateway WhatsApp Fonnte.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
            <a
              href="/settings"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm"
            >
              Konfigurasi System & Fonnte WA
            </a>
            <a
              href="/reminders"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            >
              Log WhatsApp Reminders
            </a>
            <a
              href="/audit-logs"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            >
              Audit Trail Activity Logs
            </a>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Card 1: Finance Parameters */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Montserrat'] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <span>Parameter Keuangan Kas & Tagihan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Kas Bulanan (Rp)
                </label>
                <input
                  type="number"
                  required
                  value={settings.DEFAULT_MONTHLY_AMOUNT || '50000'}
                  onChange={(e) => handleChange('DEFAULT_MONTHLY_AMOUNT', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Nominal standar per anggota per bulan.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Terbit Tagihan (Tgl 1 - 28)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={28}
                  value={settings.CYCLE_START_DAY || '25'}
                  onChange={(e) => handleChange('CYCLE_START_DAY', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Tanggal mulai terbit tagihan (contoh: 25 Agustus).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jatuh Tempo Bulan Depan (Tgl 1 - 28)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={28}
                  value={settings.DUE_DATE_DAY || '15'}
                  onChange={(e) => handleChange('DUE_DATE_DAY', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Batas bayar bulan berikutnya (contoh: 15 September).</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Petunjuk & Metode Pembayaran Kas (Tampil di Portal Anggota)
                </label>
                <textarea
                  rows={2}
                  value={
                    settings.PAYMENT_METHOD_INFO ||
                    'Pembayaran Kas Sosial disetor tunai (CASH) langsung ke Bendahara Measuring Center / Transfer Bank'
                  }
                  onChange={(e) => handleChange('PAYMENT_METHOD_INFO', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Petunjuk ini akan muncul pada banner tagihan di portal anggota (misal: "Disetor tunai CASH ke Bendahara").
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Fonnte WhatsApp API Setup & Live Connection Tester */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Montserrat'] flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              <span>Integrasi Fonnte WhatsApp Gateway API</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fonnte API Endpoint URL
                </label>
                <input
                  type="text"
                  required
                  value={settings.FONNTE_API_URL || 'https://api.fonnte.com/send'}
                  onChange={(e) => handleChange('FONNTE_API_URL', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fonnte API Token Key (Ambil dari fonnte.com)
                </label>
                <input
                  type="password"
                  placeholder="Masukkan API Token dari fonnte.com"
                  value={settings.FONNTE_API_TOKEN || ''}
                  onChange={(e) => handleChange('FONNTE_API_TOKEN', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Jika Token dikosongkan/mock, pengiriman notifikasi berjalan dalam mode SIMULASI aman.
                </p>
              </div>
            </div>

            {/* Live Connection Test Box */}
            <div className="mt-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase">Uji Coba Koneksi Fonnte WA</h4>
                  <p className="text-[11px] text-emerald-700">
                    Kirim pesan uji coba untuk memastikan API Token Fonnte terhubung dengan HP pengirim.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik Nomor HP Penguji (cth: 081234567890)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full sm:w-80 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestWaConnection}
                  disabled={testingWa || !testPhone}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {testingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {testingWa ? 'Menguji Koneksi...' : 'Tes Kirim Pesan WA'}
                </button>
              </div>

              {testWaResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    testWaResult.success
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                      : 'bg-rose-100 border border-rose-300 text-rose-800'
                  }`}
                >
                  {testWaResult.success ? testWaResult.message : testWaResult.error}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: WhatsApp Templates */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Montserrat'] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <span>Template Pesan Notifikasi WhatsApp</span>
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Template Tagihan / Reminder Kas
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    Placeholder: {'{nama}'}, {'{npk}'}, {'{periode}'}, {'{nominal}'}, {'{jatuh_tempo}'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={
                    settings.WA_TEMPLATE_REMINDER ||
                    'Halo {nama} ({npk}), mengingatkan pembayaran Kas Sosial Measuring Center untuk periode {periode} sebesar {nominal}. Jatuh tempo pada tanggal {jatuh_tempo}. Terima kasih!'
                  }
                  onChange={(e) => handleChange('WA_TEMPLATE_REMINDER', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Template Kwitansi / Konfirmasi Pelunasan
                  </label>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Placeholder: {'{nama}'}, {'{npk}'}, {'{periode}'}, {'{nominal}'}, {'{tanggal_bayar}'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={
                    settings.WA_TEMPLATE_RECEIPT ||
                    'Terima kasih {nama} ({npk}), pembayaran Kas Sosial Measuring Center periode {periode} sebesar {nominal} telah DITERIMA dan DIVERIFIKASI pada tanggal {tanggal_bayar}.'
                  }
                  onChange={(e) => handleChange('WA_TEMPLATE_RECEIPT', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
