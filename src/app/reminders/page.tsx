'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { formatDateTimeIndo, formatPhoneDisplay } from '@/src/lib/format';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  RefreshCw,
  Eye,
  Calendar,
  Clock,
  Zap,
  Check,
  X,
  Loader2,
  BellRing,
} from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';

export default function RemindersPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [cronTriggerLoading, setCronTriggerLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/reminders')
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Trigger Bulk Reminders
  const handleBulkReminder = async () => {
    if (!confirm('Kirim pengingat WhatsApp ke semua anggota yang belum lunas?')) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BULK' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Berhasil mengirim pengingat ke ${data.bulkRes?.totalSent || 0} anggota`);
        fetchLogs();
      } else {
        alert(data.error || 'Gagal mengirim pengingat massal');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    } finally {
      setBulkLoading(false);
    }
  };

  // Trigger Auto-Reminder Cron On-Demand
  const handleTriggerAutoReminder = async () => {
    if (!confirm('Jalankan jadwal otomatis reminder sekarang (simulasi kirim ke semua penunggak)?')) return;
    setCronTriggerLoading(true);
    try {
      const res = await fetch('/api/cron/reminders', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Auto-reminder sukses dijalankan: ${data.totalSent} anggota diproses!`);
        fetchLogs();
      } else {
        alert(data.error || 'Gagal mengeksekusi auto-reminder');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat memproses auto-reminder');
    } finally {
      setCronTriggerLoading(false);
    }
  };

  return (
    <AppLayout title="Notifikasi WhatsApp">
      <div className="space-y-4 max-w-7xl mx-auto">
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

        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Montserrat']">
                Log Notifikasi WhatsApp
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                {logs.length} Log
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Riwayat pengingat tagihan dan konfirmasi transaksi via Fonnte
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleBulkReminder}
              disabled={bulkLoading}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{bulkLoading ? 'Mengirim...' : 'Kirim Reminder Massal'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <a
            href="/reminders"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs"
          >
            Log WhatsApp
          </a>
          <a
            href="/settings"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Konfigurasi Fonnte
          </a>
          <a
            href="/audit-logs"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Audit Trail
          </a>
        </div>

        {/* AUTO-REMINDER SCHEDULE CARD (TANGGAL 25, 5, 15) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-['Montserrat']">
                  Jadwal Auto-Reminder Aktif (3 Tahap Bulanan)
                </h3>
                <p className="text-[11px] text-indigo-200">
                  Sistem otomatis mengirim WhatsApp tagihan rapel ke seluruh anggota belum bayar
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerAutoReminder}
              disabled={cronTriggerLoading}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              {cronTriggerLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Jalankan Auto-Reminder Sekarang</span>
            </button>
          </div>

          {/* 3 Schedule Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Tahap 1 • Awal Siklus</span>
                <Clock className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-base font-black font-['Montserrat'] mt-1 text-white">Tanggal 25</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">
                Pengingat terbit tagihan baru (09:00 WIB)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-amber-400">Tahap 2 • Tengah Periode</span>
                <Clock className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-base font-black font-['Montserrat'] mt-1 text-white">Tanggal 05</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">
                Pengingat pertengahan periode kas (09:00 WIB)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-rose-400">Tahap 3 • Pra Cut-Off</span>
                <Clock className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-base font-black font-['Montserrat'] mt-1 text-white">Tanggal 15</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">
                Peringatan menjelang penutupan tgl 24 (09:00 WIB)
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Memuat riwayat pengingat...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Belum ada riwayat pengiriman notifikasi WhatsApp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Waktu Kirim</th>
                    <th className="py-2.5 px-3">Penerima</th>
                    <th className="py-2.5 px-3">No. WhatsApp</th>
                    <th className="py-2.5 px-3">Perihal / Periode</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Pengirim</th>
                    <th className="py-2.5 px-3 text-right">Pesan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {formatDateTimeIndo(log.sentAt)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{log.recipientName}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {formatPhoneDisplay(log.phoneNumber)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{log.periodTitle}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SENT'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status === 'SIMULATED'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.status === 'SENT' ? 'Terkirim' : log.status === 'SIMULATED' ? 'Simulasi' : 'Gagal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{log.sentByAdminName}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedMessage(log.message)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Lihat</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <Modal
          isOpen={Boolean(selectedMessage)}
          onClose={() => setSelectedMessage(null)}
          title="Isi Pesan WhatsApp Terkirim"
        >
          <div className="space-y-4">
            <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
              {selectedMessage}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
