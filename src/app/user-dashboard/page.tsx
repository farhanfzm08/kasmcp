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
  Heart,
  Plus,
  Loader2,
  X,
  Clock,
  Check,
  FileText,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export default function UserDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'BILLS' | 'BENEFITS'>('BILLS');
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL | UNPAID | PAID

  // Claim States
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<any[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form inputs
  const [claimBenefitTypeId, setClaimBenefitTypeId] = useState('');
  const [claimRecipientType, setClaimRecipientType] = useState('MEMBER');
  const [claimRecipientName, setClaimRecipientName] = useState('');
  const [claimRelationship, setClaimRelationship] = useState('Diri Sendiri');
  const [claimEventDate, setClaimEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimAmount, setClaimAmount] = useState<number>(500000);
  const [claimDescription, setClaimDescription] = useState('');
  const [claimProofUrl, setClaimProofUrl] = useState('');

  const fetchPortalData = () => {
    fetch('/api/user/portal')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        if (resData?.user?.name && !claimRecipientName) {
          setClaimRecipientName(resData.user.name);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchMyClaims = () => {
    fetch('/api/claims')
      .then((res) => res.json())
      .then((resData) => setMyClaims(resData.claims || []))
      .catch((err) => console.error(err));
  };

  const fetchBenefitTypes = () => {
    fetch('/api/benefit-types')
      .then((res) => res.json())
      .then((resData) => {
        const types = resData.benefitTypes || [];
        setBenefitTypes(types);
        if (types.length > 0 && !claimBenefitTypeId) {
          setClaimBenefitTypeId(types[0].id);
          setClaimAmount(types[0].defaultAmount || 500000);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchPortalData();
    fetchMyClaims();
    fetchBenefitTypes();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBenefitTypeChange = (typeId: string) => {
    setClaimBenefitTypeId(typeId);
    const selected = benefitTypes.find((b) => b.id === typeId);
    if (selected) {
      setClaimAmount(selected.defaultAmount || 500000);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimBenefitTypeId || !claimRecipientName || !claimAmount) {
      alert('Harap lengkapi semua kolom wajib');
      return;
    }

    setSubmittingClaim(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          benefitTypeId: claimBenefitTypeId,
          recipientType: claimRecipientType,
          recipientName: claimRecipientName,
          recipientRelationship: claimRelationship,
          eventDate: claimEventDate,
          amount: claimAmount,
          description: claimDescription,
          proofUrl: claimProofUrl,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        showToast('Pengajuan klaim santunan berhasil dikirim! Menunggu verifikasi pengurus.');
        setShowClaimModal(false);
        fetchMyClaims();
        setClaimDescription('');
        setClaimProofUrl('');
      } else {
        alert(resData.error || 'Gagal mengajukan santunan');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat mengirim pengajuan santunan');
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Portal Anggota">
        <div className="flex flex-col items-center justify-center h-80 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Memuat portal anggota...</p>
        </div>
      </AppLayout>
    );
  }

  const user = data?.user;
  const obligations: any[] = data?.obligations || [];
  const unpaidObligations: any[] = data?.unpaidObligations || [];
  const totalUnpaidAmount = data?.totalUnpaidAmount || 0;
  const paymentMethodInfo =
    data?.paymentMethodInfo ||
    'Pembayaran Kas Sosial disetor tunai (CASH) langsung ke Bendahara Measuring Center';

  const filteredObligations = obligations.filter((o) => {
    if (filterStatus === 'UNPAID') return o.status === 'BELUM_BAYAR' || o.status === 'TERLAMBAT';
    if (filterStatus === 'PAID') return o.status === 'SUDAH_BAYAR';
    return true;
  });

  return (
    <AppLayout title="Portal Anggota">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white font-medium text-xs shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header Summary Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-bold">
                  NPK: {user?.npk}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                  Anggota Aktif
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 font-['Montserrat']">
                Hai, {user?.name}!
              </h2>
              <p className="text-xs text-indigo-200 mt-1">
                Siklus kas berjalan tgl 25 ke cut-off tgl 24 setiap bulannya
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                  Total Saldo Kas Organisasi
                </p>
                <p className="text-xl font-black font-['Montserrat']">
                  {formatRupiah(data?.currentBalance || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DUAL MAIN NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveMainTab('BILLS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'BILLS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Kewajiban Kas Bulanan</span>
            {unpaidObligations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {unpaidObligations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainTab('BENEFITS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'BENEFITS'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Santunan Sosial & Klaim Mandiri</span>
            {myClaims.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black">
                {myClaims.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: KEWAJIBAN KAS BULANAN */}
        {activeMainTab === 'BILLS' && (
          <div className="space-y-6">
            {/* Arrears Summary Alert */}
            {unpaidObligations.length > 0 ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-950 font-['Montserrat']">
                      Anda Memiliki {unpaidObligations.length} Tunggakan Kas Belum Lunas
                    </h3>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Total Akumulasi:{' '}
                      <strong className="text-rose-950 font-black font-['Montserrat'] text-sm">
                        {formatRupiah(totalUnpaidAmount)}
                      </strong>{' '}
                      ({unpaidObligations.map((o) => o.cashPeriod?.title.replace('Kas Sosial ', '')).join(', ')})
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-rose-100 shrink-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Cara Pembayaran:</p>
                  <p className="font-semibold text-slate-800">{paymentMethodInfo}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                    Semua Tagihan Kas Anda Telah Lunas
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    Terima kasih atas kedisiplinan dan kontribusi Anda menjaga kas sosial organisasi.
                  </p>
                </div>
              </div>
            )}

            {/* Obligations Table Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Montserrat']">
                    Riwayat Tagihan Kas Bulanan
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Periode kas baru otomatis terbit setiap tanggal 25
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === 'ALL' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Semua ({obligations.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('UNPAID')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === 'UNPAID' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Belum ({unpaidObligations.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('PAID')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === 'PAID' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Lunas ({obligations.filter((o) => o.status === 'SUDAH_BAYAR').length})
                  </button>
                </div>
              </div>

              {filteredObligations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Tidak ada data tagihan ditemukan untuk kategori ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Periode Kas</th>
                        <th className="py-2.5 px-3">Jatuh Tempo</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Tanggal Lunas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredObligations.map((ob) => (
                        <tr key={ob.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {ob.cashPeriod?.title ? ob.cashPeriod.title.replace('Kas Sosial ', '') : ''}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {formatDateIndo(ob.dueDate)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 font-['Montserrat']">
                            {formatRupiah(ob.amount)}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={ob.status} />
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {ob.paidAt ? formatDateIndo(ob.paidAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SANTUNAN SOSIAL & KLAIM MANDIRI (FITUR 3) */}
        {activeMainTab === 'BENEFITS' && (
          <div className="space-y-6">
            {/* Header Action Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-bold text-slate-900 font-['Montserrat']">
                    Pengajuan Santunan Sosial Mandiri
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ajukan santunan jika Anda atau keluarga inti mengalami musibah sakit, duka, pernikahan, dll.
                </p>
              </div>

              <button
                onClick={() => setShowClaimModal(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-rose-600/20 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ajukan Santunan Baru</span>
              </button>
            </div>

            {/* Riwayat Klaim Anggota */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 font-['Montserrat']">
                Riwayat Pengajuan Santunan Anda
              </h4>

              {myClaims.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Heart className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">Belum Ada Pengajuan Santunan</p>
                  <p className="text-[11px] text-slate-400">
                    Klik tombol "+ Ajukan Santunan Baru" jika Anda memerlukan bantuan sosial kas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
                            {claim.benefitTypeName}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            Diajukan: {formatDateIndo(claim.createdAt)}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm mt-1">
                          {claim.recipientName} ({claim.recipientRelationship || 'Diri Sendiri'})
                        </p>
                        {claim.description && (
                          <p className="text-[11px] text-slate-600 mt-0.5">{claim.description}</p>
                        )}
                        {claim.rejectionReason && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1">
                            Alasan Penolakan: {claim.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                        <span className="text-sm font-black text-slate-900 font-['Montserrat']">
                          {formatRupiah(claim.amount)}
                        </span>
                        <div>
                          {claim.status === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Menunggu Verifikasi
                            </span>
                          )}
                          {claim.status === 'APPROVED' && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Disetujui & Dicairkan
                            </span>
                          )}
                          {claim.status === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Ditolak
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Plafon & Aturan Santunan Tersedia */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Plafon Santunan Kas Sosial yang Berlaku:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {benefitTypes.map((bt) => (
                  <div key={bt.id} className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
                    <p className="font-bold text-slate-900">{bt.name}</p>
                    <p className="text-base font-black text-rose-600 font-['Montserrat'] mt-1">
                      {formatRupiah(bt.defaultAmount)}
                    </p>
                    {bt.rules && <p className="text-[10px] text-slate-400 mt-1">{bt.rules}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL PENGAJUAN KLAIM SANTUNAN */}
        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-['Montserrat']">
                      Formulir Pengajuan Santunan
                    </h3>
                    <p className="text-[10px] text-slate-400">Kas Sosial Measuring Center</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitClaim} className="space-y-3.5 text-xs">
                {/* Jenis Santunan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jenis Santunan *
                  </label>
                  <select
                    value={claimBenefitTypeId}
                    onChange={(e) => handleBenefitTypeChange(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {benefitTypes.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.name} — Standar: {formatRupiah(bt.defaultAmount)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hubungan & Nama Penerima */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Hubungan Penerima *
                    </label>
                    <select
                      value={claimRelationship}
                      onChange={(e) => setClaimRelationship(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Diri Sendiri">Diri Sendiri (Anggota)</option>
                      <option value="Suami / Istri">Suami / Istri</option>
                      <option value="Anak">Anak Kandung</option>
                      <option value="Orang Tua">Orang Tua Kandung</option>
                      <option value="Mertua">Mertua</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Penerima *
                    </label>
                    <input
                      type="text"
                      required
                      value={claimRecipientName}
                      onChange={(e) => setClaimRecipientName(e.target.value)}
                      placeholder="Nama lengkap yang bersangkutan..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Tanggal & Nominal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal Kejadian *
                    </label>
                    <input
                      type="date"
                      required
                      value={claimEventDate}
                      onChange={(e) => setClaimEventDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nominal Santunan (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Keterangan / Kronologi Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    placeholder="Contoh: Rawat inap RS Medika selama 3 hari karena sakit DBD..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Link Dokumen / Foto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Link Bukti / Foto Dokumen (Opsional)
                  </label>
                  <input
                    type="text"
                    value={claimProofUrl}
                    onChange={(e) => setClaimProofUrl(e.target.value)}
                    placeholder="Contoh: link Google Drive / foto kuitansi RS / surat keterangan..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {submittingClaim ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Kirim Pengajuan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
