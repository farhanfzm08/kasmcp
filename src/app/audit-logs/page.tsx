'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { formatDateTimeIndo } from '@/src/lib/format';
import { ShieldCheck, Search, Filter, History } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    fetch(`/api/audit-logs?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  return (
    <AppLayout title="Audit Trail System">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
              Jejak Audit & Log Keamanan Aplikasi
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Seluruh aktivitas pengeditan anggota, verifikasi pembayaran, dan perubahan sistem dicatat secara permanen.
            </p>
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            Log WhatsApp Reminders
          </a>
          <a
            href="/audit-logs"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm"
          >
            Audit Trail Activity Logs
          </a>
        </div>

        {/* Search */}
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari aksi, admin, rincian audit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="glass-card p-6 rounded-3xl">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm font-medium">
              Memuat log audit...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Belum ada log audit terekam.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Aksi / Event</th>
                    <th className="py-3 px-4">Pengguna (Admin)</th>
                    <th className="py-3 px-4">Entitas Terkait</th>
                    <th className="py-3 px-4">Rincian Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        {formatDateTimeIndo(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900">
                        {log.userName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {log.entityType} ({log.entityId || '-'})
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 font-mono">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
