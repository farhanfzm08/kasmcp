'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { formatDateTimeIndo, formatPhoneDisplay } from '@/src/lib/format';
import { MessageSquare, Send, CheckCircle2, RefreshCw, Eye } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';

export default function RemindersPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
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

  const handleBulkReminder = async () => {
    if (!confirm('Kirim pengingat WhatsApp ke SEMUA anggota yang BELUM MEMBAYAR?')) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BULK' }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(`Berhasil memproses ${data.bulkRes?.totalSent || 0} pengingat WhatsApp!`);
        fetchLogs();
      } else {
        alert(data.error || 'Gagal mengirim pengingat massal');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    } finally {
      setBulkLoading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <AppLayout title="Log Reminder WhatsApp">
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

        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
              Riwayat & Audit Log Notifikasi WhatsApp
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Catatan pesan pengingat tagihan dan konfirmasi pembayaran terkirim via Fonnte.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs"
              title="Refresh Log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleBulkReminder}
              disabled={bulkLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {bulkLoading ? 'Mengirim...' : 'Kirim Reminder Massal'}
            </button>
          </div>
        </div>

        {/* Pengaturan Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <a
            href="/settings"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Konfigurasi System & Fonnte WA
          </a>
          <a
            href="/reminders"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm"
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

        {/* Table */}
        <div className="glass-card p-6 rounded-3xl">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm font-medium">
              Memuat log pengingat...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Belum ada riwayat pengiriman notifikasi WhatsApp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Waktu Kirim</th>
                    <th className="py-3 px-4">Penerima (NPK)</th>
                    <th className="py-3 px-4">No. WhatsApp</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Status Pengiriman</th>
                    <th className="py-3 px-4">Pengirim</th>
                    <th className="py-3 px-4 text-right">Preview Pesan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-600">{formatDateTimeIndo(log.sentAt)}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{log.recipientName}</div>
                        <div className="text-xs text-slate-400 font-mono">NPK: {log.recipientNpk}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {formatPhoneDisplay(log.phoneNumber)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-indigo-700">{log.periodTitle}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{log.sentByAdminName}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedMessage(log.message)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Teks
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal View Teks */}
        <Modal
          isOpen={selectedMessage !== null}
          onClose={() => setSelectedMessage(null)}
          title="Teks Pesan WhatsApp Terkirim"
        >
          <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200">
            <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
              {selectedMessage}
            </pre>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setSelectedMessage(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Tutup
            </button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
