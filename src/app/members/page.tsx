'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Modal } from '@/src/components/ui/Modal';
import { formatDateIndo, formatPhoneDisplay } from '@/src/lib/format';
import { 
  Users, UserPlus, Search, Filter, Edit3, Power, PhoneCall, Check, X, Shield, User, 
  UploadCloud, Download, FileSpreadsheet, AlertCircle, CheckCircle2 
} from 'lucide-react';

interface ParsedMember {
  npk: string;
  name: string;
  phone: string;
  password?: string;
  isValid: boolean;
  error?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Form State
  const [formNpk, setFormNpk] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('USER');
  const [formJoinedAt, setFormJoinedAt] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk Upload State
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedMember[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const fetchMembers = () => {
    setLoading(true);
    let url = `/api/members?search=${encodeURIComponent(search)}`;
    if (statusFilter !== 'all') {
      url += `&status=${statusFilter}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter]);

  const handleOpenAdd = () => {
    setFormNpk('');
    setFormName('');
    setFormPassword('user123');
    setFormPhone('');
    setFormRole('USER');
    setFormJoinedAt(new Date().toISOString().split('T')[0]);
    setFormError('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (m: any) => {
    setSelectedMember(m);
    setFormNpk(m.npk);
    setFormName(m.name);
    setFormPassword('');
    setFormPhone(m.phone);
    setFormRole(m.role);
    setFormJoinedAt(m.joinedAt ? new Date(m.joinedAt).toISOString().split('T')[0] : '');
    setFormError('');
    setIsEditOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npk: formNpk,
          name: formName,
          password: formPassword,
          phone: formPhone,
          role: formRole,
          joinedAt: formJoinedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan anggota');

      setIsAddOpen(false);
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload: any = {
        name: formName,
        phone: formPhone,
        role: formRole,
        joinedAt: formJoinedAt,
      };
      if (formPassword.trim() !== '') {
        payload.password = formPassword;
      }

      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui anggota');

      setIsEditOpen(false);
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (m: any) => {
    const confirmMsg = m.isActive
      ? `Apakah Anda yakin ingin menonaktifkan anggota ${m.name} (${m.npk})?`
      : `Apakah Anda yakin ingin mengaktifkan kembali anggota ${m.name} (${m.npk})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/members/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !m.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengubah status');
      }

      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- BULK UPLOAD HANDLERS ---
  const handleOpenBulk = () => {
    setBulkInputText('');
    setBulkPreview([]);
    setBulkError('');
    setBulkSuccessMsg('');
    setIsBulkOpen(true);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 
      "npk,name,phone,password\n" +
      "1006,Budi Santoso,081234567890,user123\n" +
      "1007,Siti Aminah,081234567891,user123\n" +
      "1008,Agus Raharjo,081234567892,user123";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'master_template_anggota.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseTextToMembers = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      setBulkPreview([]);
      return;
    }

    const parsed: ParsedMember[] = [];

    lines.forEach((line, index) => {
      // Skip empty lines
      if (!line.trim()) return;

      // Detect separator: Tab, Comma, or Semicolon
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else {
        parts = line.split(',');
      }

      const p0 = parts[0]?.trim() || '';
      const p1 = parts[1]?.trim() || '';
      const p2 = parts[2]?.trim() || '';
      const p3 = parts[3]?.trim() || 'user123';

      // Skip header row if present
      if (index === 0 && (p0.toLowerCase() === 'npk' || p1.toLowerCase() === 'nama' || p1.toLowerCase() === 'name')) {
        return;
      }

      const isValid = Boolean(p0 && p1 && p2);
      let err = '';
      if (!p0) err = 'NPK kosong';
      else if (!p1) err = 'Nama kosong';
      else if (!p2) err = 'No HP kosong';

      parsed.push({
        npk: p0.toUpperCase(),
        name: p1,
        phone: p2,
        password: p3 || 'user123',
        isValid,
        error: err,
      });
    });

    setBulkPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkInputText(text);
      parseTextToMembers(text);
    };
    reader.readAsText(file);
  };

  const handleBulkTextChange = (text: string) => {
    setBulkInputText(text);
    parseTextToMembers(text);
  };

  const handleProcessBulkUpload = async () => {
    const validMembers = bulkPreview.filter((m) => m.isValid);
    if (validMembers.length === 0) {
      setBulkError('Tidak ada baris data valid yang siap diupload.');
      return;
    }

    setBulkError('');
    setBulkSuccessMsg('');
    setBulkSubmitting(true);

    try {
      const res = await fetch('/api/members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: validMembers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses bulk upload');

      setBulkSuccessMsg(
        `Berhasil mengunggah ${data.insertedCount} akun anggota baru!` +
        (data.skippedCount > 0 ? ` (${data.skippedCount} NPK dilewati karena sudah terdaftar)` : '')
      );

      setBulkInputText('');
      setBulkPreview([]);
      fetchMembers();
    } catch (err: any) {
      setBulkError(err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <AppLayout title="Anggota">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 font-['Montserrat']">Daftar Anggota</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  {members.length} Orang
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Kelola akun, role, dan data kontak kas</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Bulk Upload Button */}
            <button
              onClick={handleOpenBulk}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bulk Upload</span>
            </button>

            {/* Single Add Member Button */}
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Anggota Baru</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NPK, nama, atau no. HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              Memuat data anggota...
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Tidak ada data anggota yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">NPK</th>
                    <th className="py-2.5 px-3">Nama Anggota</th>
                    <th className="py-2.5 px-3">WhatsApp</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Bergabung</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{m.npk}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{m.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        <a
                          href={`https://wa.me/${m.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3 text-emerald-500" />
                          {formatPhoneDisplay(m.phone)}
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            m.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {m.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{formatDateIndo(m.joinedAt)}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.isActive ? 'AKTIF' : 'NONAKTIF'} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-2 text-indigo-600 hover:bg-indigo-100/70 rounded-lg transition-colors"
                            title="Edit Anggota"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(m)}
                            className={`p-2 rounded-lg transition-colors ${
                              m.isActive
                                ? 'text-rose-600 hover:bg-rose-100/70'
                                : 'text-emerald-600 hover:bg-emerald-100/70'
                            }`}
                            title={m.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Add Member */}
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Anggota Baru">
          <form onSubmit={handleCreateMember} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NPK (Unik)</label>
              <input
                type="text"
                required
                placeholder="Contoh: 1006"
                value={formNpk}
                onChange={(e) => setFormNpk(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="Nama Lengkap Anggota"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password Default</label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="081234567890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role User</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="USER">USER (Anggota)</option>
                  <option value="ADMIN">ADMIN (Pengelola)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal Bergabung</label>
                <input
                  type="date"
                  value={formJoinedAt}
                  onChange={(e) => setFormJoinedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Anggota'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Edit Member */}
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Anggota: ${selectedMember?.name}`}>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NPK (Tidak dapat diubah)</label>
              <input
                type="text"
                disabled
                value={formNpk}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password Baru (Opsional)</label>
                <input
                  type="password"
                  placeholder="Kosongkan jika tak diubah"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role User</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="USER">USER (Anggota)</option>
                  <option value="ADMIN">ADMIN (Pengelola)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal Bergabung</label>
                <input
                  type="date"
                  value={formJoinedAt}
                  onChange={(e) => setFormJoinedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Perbarui Anggota'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Bulk Upload */}
        <Modal 
          isOpen={isBulkOpen} 
          onClose={() => setIsBulkOpen(false)} 
          title="Bulk Upload Akun Anggota Baru"
        >
          <div className="space-y-5">
            {/* Download Template Master */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Format Master CSV</h4>
                  <p className="text-[11px] text-slate-500">Unduh template CSV resmi untuk mengisi data anggota massal.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Master CSV
              </button>
            </div>

            {bulkError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{bulkError}</span>
              </div>
            )}

            {bulkSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            {/* Input Options: File or Paste */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Pilih File CSV atau Tempel (Paste) Teks dari Excel
              </label>
              
              <div className="mb-3">
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-xl p-1"
                />
              </div>

              <textarea
                rows={5}
                placeholder="Atau tempel baris data dari Excel di sini:&#10;NPK [TAB/KOMA] Nama [TAB/KOMA] No. HP [TAB/KOMA] Password&#10;&#10;Contoh:&#10;1006, Budi Santoso, 081234567890, user123&#10;1007, Siti Aminah, 081234567891, user123"
                value={bulkInputText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">
                Pemisah kolom bisa menggunakan tanda koma (,), titik koma (;), atau TAB (copy langsung dari tabel Excel).
              </span>
            </div>

            {/* Preview Section */}
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Preview Data ({bulkPreview.filter((p) => p.isValid).length} Valid dari {bulkPreview.length} Baris):
                  </span>
                  {bulkPreview.some((p) => !p.isValid) && (
                    <span className="text-rose-500 font-semibold text-[11px]">
                      Ada baris yang tidak lengkap!
                    </span>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">NPK</th>
                        <th className="py-2 px-3">Nama</th>
                        <th className="py-2 px-3">No. HP</th>
                        <th className="py-2 px-3">Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkPreview.map((item, idx) => (
                        <tr key={idx} className={item.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/50'}>
                          <td className="py-1.5 px-3">
                            {item.isValid ? (
                              <span className="inline-flex items-center text-emerald-600 font-bold text-[10px] gap-0.5">
                                <Check className="w-3 h-3" /> Siap
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-rose-600 font-bold text-[10px] gap-0.5">
                                <X className="w-3 h-3" /> {item.error}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-800">{item.npk || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-700">{item.name || '-'}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">{item.phone || '-'}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-400">{item.password || 'user123'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={bulkSubmitting || bulkPreview.filter((p) => p.isValid).length === 0}
                onClick={handleProcessBulkUpload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                {bulkSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload {bulkPreview.filter((p) => p.isValid).length} Anggota</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
