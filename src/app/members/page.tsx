'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/src/components/layout/AppLayout';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Modal } from '@/src/components/ui/Modal';
import { formatDateIndo, formatPhoneDisplay } from '@/src/lib/format';
import { Users, UserPlus, Search, Filter, Edit3, Power, PhoneCall, Check, X, Shield, User } from 'lucide-react';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
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

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan anggota');
      }

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
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          password: formPassword || undefined,
          role: formRole,
          joinedAt: formJoinedAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui anggota');
      }

      setIsEditOpen(false);
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (m: any) => {
    const actionText = m.isActive ? 'menonaktifkan' : 'mengaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun ${m.name} (${m.npk})?`)) return;

    try {
      const res = await fetch(`/api/members/${m.id}`, { method: 'PATCH' });
      if (res.ok) {
        fetchMembers();
      } else {
        alert('Gagal mengubah status');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  return (
    <AppLayout title="Kelola Data Anggota">
      <div className="space-y-6">
        {/* Header Bar & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
              Data Anggota Measuring Center
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola data anggota, hak akses role, serta status keaktifan keanggotaan.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Anggota Baru
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NPK, Nama, No. HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Sahaja</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="glass-card p-6 rounded-3xl">
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-medium text-sm">
              Memuat data anggota...
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Tidak ada data anggota ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">NPK</th>
                    <th className="py-3 px-4">Nama Anggota</th>
                    <th className="py-3 px-4">No. WhatsApp</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Tanggal Gabung</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
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
      </div>
    </AppLayout>
  );
}
