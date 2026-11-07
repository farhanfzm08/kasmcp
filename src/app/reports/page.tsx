'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { formatRupiah, formatDateIndo } from '@/src/lib/format';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('KAS_UTAMA');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = () => {
    setLoading(true);
    let url = `/api/reports?type=${reportType}&month=${month}&year=${year}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setReportData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, month, year]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'KAS_UTAMA') {
      csvContent += 'LAPORAN KAS SOSIAL MEASURING CENTER\n';
      csvContent += `Periode: ${month}/${year}\n\n`;
      csvContent += `Saldo Awal,${reportData.summary?.saldoAwal || 0}\n`;
      csvContent += `Total Pemasukan,${reportData.summary?.totalIncome || 0}\n`;
      csvContent += `Total Pengeluaran,${reportData.summary?.totalExpense || 0}\n`;
      csvContent += `Saldo Akhir,${reportData.summary?.saldoAkhir || 0}\n\n`;
      csvContent += 'Tanggal,Tipe,Judul / Keterangan,Kategori,Nominal (Rp)\n';

      reportData.incomes?.forEach((i: any) => {
        csvContent += `"${formatDateIndo(i.date)}","PEMASUKAN","${i.title}","${i.category}",${i.amount}\n`;
      });
      reportData.expenses?.forEach((e: any) => {
        csvContent += `"${formatDateIndo(e.date)}","PENGELUARAN","${e.recipientName} (${e.benefitTypeName || 'Pengeluaran'})","${e.benefitTypeName || 'Pengeluaran'}",-${e.amount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kas_${reportType}_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout title="Laporan Kas & Transparansi">
      <div className="space-y-6">
        {/* Controls Header - Hidden on Print */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
              Laporan Keuangan Kas Sosial
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cetak dan ekspor laporan keuangan kas resmi untuk pertanggungjawaban audit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Ekspor CSV / Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-opacity flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak PDF / Print
            </button>
          </div>
        </div>

        {/* Filters Toolbar - Hidden on Print */}
        <div className="no-print glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700 uppercase">Jenis Laporan:</span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-600"
            >
              <option value="KAS_UTAMA">Laporan Kas Utama (Buku Kas Umum)</option>
              <option value="PEMASUKAN">Laporan Pemasukan (Donasi & Kas)</option>
              <option value="PENGELUARAN">Laporan Pengeluaran & Santunan</option>
              <option value="PEMBAYARAN_ANGGOTA">Laporan Status Pembayaran Anggota</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600"
            >
              {[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((mName, idx) => (
                <option key={idx} value={String(idx + 1)}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* Report Printable Document Wrapper */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-lg space-y-8">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-indigo-600 pb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 font-['Montserrat'] tracking-tight">
                KAS SOSIAL MEASURING CENTER
              </h1>
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
                LAPORAN PERTANGGUNGJAWABAN KEUANGAN RESMI
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Periode: Bulan {month} Tahun {year}
              </p>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-mono font-bold text-indigo-700">
                DOC-KAS-{year}{month}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm font-medium">
              Menyusun laporan keuangan...
            </div>
          ) : (
            <>
              {/* Summary Balance Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo Awal</p>
                  <p className="text-lg font-black text-slate-800 font-['Montserrat'] mt-1">
                    {formatRupiah(reportData?.summary?.saldoAwal || 0)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Pemasukan</p>
                  <p className="text-lg font-black text-emerald-800 font-['Montserrat'] mt-1">
                    + {formatRupiah(reportData?.summary?.totalIncome || 0)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Total Pengeluaran</p>
                  <p className="text-lg font-black text-rose-800 font-['Montserrat'] mt-1">
                    - {formatRupiah(reportData?.summary?.totalExpense || 0)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                  <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Saldo Akhir Kas</p>
                  <p className="text-lg font-black font-['Montserrat'] mt-1">
                    {formatRupiah(reportData?.summary?.saldoAkhir || 0)}
                  </p>
                </div>
              </div>

              {/* Detail Table based on Report Type */}
              {reportType === 'KAS_UTAMA' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 font-['Montserrat'] uppercase tracking-wider">
                    Rincian Mutasi Buku Kas Utama
                  </h3>
                  <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3 border-r border-slate-200">Tanggal</th>
                        <th className="p-3 border-r border-slate-200">Jenis Transaksi</th>
                        <th className="p-3 border-r border-slate-200">Keterangan / Judul</th>
                        <th className="p-3 border-r border-slate-200 text-right">Pemasukan (DEBET)</th>
                        <th className="p-3 text-right">Pengeluaran (KREDIT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {reportData?.incomes?.map((inc: any) => (
                        <tr key={`inc-${inc.id}`}>
                          <td className="p-3 border-r border-slate-200 font-mono">{formatDateIndo(inc.date)}</td>
                          <td className="p-3 border-r border-slate-200 text-emerald-700 font-bold">PEMASUKAN</td>
                          <td className="p-3 border-r border-slate-200 font-bold text-slate-900">{inc.title}</td>
                          <td className="p-3 border-r border-slate-200 text-right font-bold text-emerald-600">
                            {formatRupiah(inc.amount)}
                          </td>
                          <td className="p-3 text-right text-slate-400">-</td>
                        </tr>
                      ))}
                      {reportData?.expenses?.map((exp: any) => (
                        <tr key={`exp-${exp.id}`}>
                          <td className="p-3 border-r border-slate-200 font-mono">{formatDateIndo(exp.date)}</td>
                          <td className="p-3 border-r border-slate-200 text-rose-700 font-bold">PENGELUARAN</td>
                          <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                            {exp.benefitTypeName || 'Pengeluaran'} - {exp.recipientName}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right text-slate-400">-</td>
                          <td className="p-3 text-right font-bold text-rose-600">{formatRupiah(exp.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reportType === 'PEMBAYARAN_ANGGOTA' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 font-['Montserrat'] uppercase tracking-wider">
                    Status Pelunasan Kas Anggota Periode Ini
                  </h3>
                  <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3 border-r border-slate-200">NPK</th>
                        <th className="p-3 border-r border-slate-200">Nama Anggota</th>
                        <th className="p-3 border-r border-slate-200">Periode Tagihan</th>
                        <th className="p-3 border-r border-slate-200">Nominal</th>
                        <th className="p-3 border-r border-slate-200">Status</th>
                        <th className="p-3">Tanggal Pelunasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {reportData?.memberPayments?.map((mp: any) => (
                        <tr key={mp.id}>
                          <td className="p-3 border-r border-slate-200 font-mono font-bold">{mp.user?.npk}</td>
                          <td className="p-3 border-r border-slate-200 font-bold text-slate-900">{mp.user?.name}</td>
                          <td className="p-3 border-r border-slate-200">{mp.cashPeriod?.title}</td>
                          <td className="p-3 border-r border-slate-200 font-bold">{formatRupiah(mp.amount)}</td>
                          <td className="p-3 border-r border-slate-200">
                            <StatusBadge status={mp.status} />
                          </td>
                          <td className="p-3 text-slate-600">{mp.paidAt ? formatDateIndo(mp.paidAt) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Signature Footer for Printed Audits */}
              <div className="pt-12 border-t border-slate-200 grid grid-cols-2 text-center text-xs font-semibold">
                <div>
                  <p className="text-slate-500">Mengetahui,</p>
                  <p className="font-bold text-slate-900 mt-1">Ketua Measuring Center</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 underline">( _____________________ )</p>
                </div>
                <div>
                  <p className="text-slate-500">Disusun oleh,</p>
                  <p className="font-bold text-slate-900 mt-1">Bendahara Kas Sosial</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 underline">( _____________________ )</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
