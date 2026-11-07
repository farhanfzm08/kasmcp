import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const upper = String(status).toUpperCase();

  if (upper === 'SUDAH_BAYAR' || upper === 'LUNAS' || upper === 'AKTIF' || upper === 'SENT' || upper === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {upper === 'SUDAH_BAYAR' ? 'Sudah Bayar' : upper === 'AKTIF' ? 'Aktif' : upper}
      </span>
    );
  }

  if (upper === 'BELUM_BAYAR' || upper === 'PENDING' || upper === 'SIMULATED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {upper === 'BELUM_BAYAR' ? 'Belum Bayar' : upper === 'SIMULATED' ? 'Simulasi (WhatsApp)' : upper}
      </span>
    );
  }

  if (upper === 'TERLAMBAT' || upper === 'NONAKTIF' || upper === 'FAILED' || upper === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        {upper === 'TERLAMBAT' ? 'Terlambat' : upper === 'NONAKTIF' ? 'Nonaktif' : upper}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {status}
    </span>
  );
}
