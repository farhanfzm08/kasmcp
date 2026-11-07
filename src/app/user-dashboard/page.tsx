'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { formatRupiah, formatDateIndo } from '@/src/lib/format';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  HeartHandshake,
  CreditCard,
  Building2,
  Banknote,
  ShieldCheck,
  Info,
} from 'lucide-react';

export default function UserDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL | UNPAID | PAID

  const fetchPortalData = () => {
    fetch('/api/user/portal')
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Portal Anggota">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  const user = data?.user;
  const obligations: any[] = data?.obligations || [];
  const unpaidObligations: any[] = data?.unpaidObligations || [];
  const totalUnpaidAmount = data?.totalUnpaidAmount || 0;
  const paymentMethodInfo = data?.paymentMethodInfo || 'Pembayaran Kas Sosial disetor tunai (CASH) langsung ke Bendahara Measuring Center';

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const filteredObligations = obligations.filter((o) => {
    if (filterStatus === 'UNPAID') return o.status === 'BELUM_BAYAR' || o.status === 'TERLAMBAT';
    if (filterStatus === 'PAID') return o.status === 'SUDAH_BAYAR';
    return true;
  });

  return (
    <AppLayout title="Portal Anggota Kas Sosial">
      <div className="space-y-8">
        {/* Header Summary Banner using Stitch Vibrant Gradient */}
        <div className="card-gradient-1 text-white p-8 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider backdrop-blur-md">
                  NPK: {user?.npk}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 font-extrabold text-xs uppercase tracking-wider backdrop-blur-md">
                  Anggota Aktif
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tight mt-3 font-['Montserrat'] text-white drop-shadow-xs">
                Selamat Datang, {user?.name}!
              </h2>
              <p className="text-xs lg:text-sm text-indigo-100 font-semibold mt-1">
                Portal Informasi & Tagihan Kas Sosial Measuring Center (Menampilkan tagihan s/d bulan berjalan).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-md flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Total Saldo Kas Organisasi</p>
                <p className="text-2xl font-black font-['Montserrat'] text-white">{formatRupiah(data?.currentBalance || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Payment Method Info Card */}
        <div className="p-5 rounded-3xl bg-blue-50 border-2 border-blue-200 flex items-start gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-blue-600/20">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 font-['Montserrat']">
              Petunjuk Pembayaran Kas Sosial
            </h3>
            <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">
              {paymentMethodInfo}
            </p>
          </div>
        </div>

        {/* Arrears Summary Alert Banner */}
        {unpaidObligations.length > 0 ? (
          <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-rose-600/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950 font-['Montserrat']">
                  Perhatian: Anda Memiliki {unpaidObligations.length} Tunggakan Kas Belum Lunas
                </h3>
                <p className="text-xs font-bold text-rose-900 mt-1">
                  Total Akumulasi Tunggakan Kas:{' '}
                  <strong className="text-rose-950 font-black font-['Montserrat'] text-sm underline">
                    {formatRupiah(totalUnpaidAmount)}
                  </strong>
                </p>
                <p className="text-xs font-semibold text-rose-800 mt-1">
                  Rincian Tunggakan:{' '}
                  {unpaidObligations.map((o) => o.cashPeriod?.title.replace('Kas Sosial ', '')).join(', ')}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 text-xs font-bold text-slate-900 shrink-0 shadow-xs">
              <p className="font-extrabold text-rose-900 uppercase text-[10px] mb-1">Setor Langsung / Cash:</p>
              <p className="text-slate-800 font-sans">Silakan serahkan uang tunai ke Bendahara Kas</p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-950 font-['Montserrat']">
                Luar Biasa! Semua Tagihan Kas Anda Telah LUNAS
              </h3>
              <p className="text-xs text-emerald-900 font-bold mt-0.5">
                Tidak ada tunggakan kas sampai dengan bulan berjalan ({now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}).
              </p>
            </div>
          </div>
        )}

        {/* ALL Obligations Table (Bulan Kebelakang & Bulan Berjalan ONLY) */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-['Montserrat'] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Tagihan Kas Bulanan Anda</span>
              </h3>
              <p className="text-xs text-slate-600 font-bold mt-1">
                Menampilkan tagihan bulan-bulan ke belakang dan bulan berjalan. Periode bulan depan akan muncul otomatis pada tanggal 1.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300 text-xs font-bold">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Semua ({obligations.length})
              </button>
              <button
                onClick={() => setFilterStatus('UNPAID')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'UNPAID'
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Belum Lunas ({unpaidObligations.length})
              </button>
              <button
                onClick={() => setFilterStatus('PAID')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'PAID'
                    ? 'bg-emerald-700 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Sudah Lunas ({obligations.filter((o) => o.status === 'SUDAH_BAYAR').length})
              </button>
            </div>
          </div>

          {filteredObligations.length === 0 ? (
            <div className="py-12 text-center text-slate-600 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-200">
              Tidak ada data tagihan kas ditemukan untuk kategori filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100 text-xs font-black text-slate-800 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Periode Kas</th>
                    <th className="py-3.5 px-4">Jatuh Tempo</th>
                    <th className="py-3.5 px-4">Nominal Tagihan</th>
                    <th className="py-3.5 px-4">Status Pembayaran</th>
                    <th className="py-3.5 px-4">Catatan & Pelunasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-bold text-sm text-slate-900">
                  {filteredObligations.map((ob) => {
                    const isCurrent =
                      ob.cashPeriod?.month === currentMonth && ob.cashPeriod?.year === currentYear;

                    return (
                      <tr
                        key={ob.id}
                        className={`hover:bg-slate-100/80 transition-colors ${
                          isCurrent ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'bg-white'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-base">
                              {ob.cashPeriod?.title ? ob.cashPeriod.title.replace('Kas Sosial ', '') : ''}
                            </span>
                            {isCurrent && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide uppercase">
                                Bulan Berjalan
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-slate-700">
                          {formatDateIndo(ob.dueDate)}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900 font-['Montserrat'] text-base">
                          {formatRupiah(ob.amount)}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={ob.status} />
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-slate-700">
                          {ob.status === 'SUDAH_BAYAR' ? (
                            <div>
                              <span className="font-extrabold text-emerald-800">
                                Lunas: {formatDateIndo(ob.paidAt)}
                              </span>
                              <div className="text-[11px] text-slate-500 font-medium">Verifikator: {ob.adminName || 'Admin'}</div>
                            </div>
                          ) : (
                            <span className="text-rose-700 font-extrabold">Belum Disetor ke Bendahara</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Benefits Guidelines Section */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-lg font-black text-slate-900 font-['Montserrat'] flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-600" />
            <span>Pedoman & Ketentuan Santunan Sosial Anggota</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.benefitTypes?.map((b: any) => (
              <div key={b.id} className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm">{b.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                    {formatRupiah(b.defaultAmount)}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-bold">{b.description}</p>
                {b.rules && <p className="text-[11px] text-slate-500 font-semibold italic">Syarat: {b.rules}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
