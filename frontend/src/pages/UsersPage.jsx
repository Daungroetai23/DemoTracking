import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Pencil, Trash2, Shield, User } from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDateShort, getRoleLabel, getRoleInfo } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users list', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      await api.post('/users', form);
      setShowAddModal(false);
      setForm({ name: '', email: '', password: '', role: 'ADMIN' });
      loadUsers();
    } catch (err) {
      alert(err.message || 'ไม่สามารถสร้างบัญชีผู้ใช้ได้');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditInit = (usr) => {
    setEditUser(usr);
    setForm({
      name: usr.name,
      email: usr.email,
      password: '', // blank by default, only hashed if they type a new one
      role: usr.role
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      // Clean up body (don't send empty password)
      const body = { ...form };
      if (!body.password) {
        delete body.password;
      }
      await api.put(`/users/${editUser.id}`, body);
      setShowEditModal(false);
      setEditUser(null);
      setForm({ name: '', email: '', password: '', role: 'ADMIN' });
      loadUsers();
    } catch (err) {
      alert(err.message || 'ไม่สามารถแก้ไขบัญชีผู้ใช้ได้');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });



  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setForm({ name: '', email: '', password: '', role: 'ADMIN' });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            เพิ่มผู้ใช้งาน
          </button>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรืออีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Shield className="w-4.5 h-4.5 text-slate-400" />
          <span>การจัดการสิทธิ์การเข้าใช้งานระบบ</span>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold">
                <th className="px-6 py-4">ชื่อผู้ใช้ระบบ</th>
                <th className="px-6 py-4">อีเมลติดต่อ</th>
                <th className="px-6 py-4 text-center">ตำแหน่ง</th>
                <th className="px-6 py-4 text-center">วันที่สร้างบัญชี</th>
                <th className="px-6 py-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((usr) => (
                <tr key={usr.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/20 transition-colors">
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {usr.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">{usr.name}</span>
                    </div>
                  </td>
                  
                  {/* Email */}
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{usr.email}</td>

                  {/* Role */}
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xxs font-bold border ${getRoleInfo(usr.role).color}`}>
                      {getRoleLabel(usr.role)}
                    </span>
                  </td>

                  {/* Date Created */}
                  <td className="px-6 py-4 text-center text-slate-400 font-bold text-xs">
                    {formatDateShort(usr.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditInit(usr)}
                        className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all border border-slate-100 hover:border-amber-100"
                        title="แก้ไขข้อมูล"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        disabled={usr.id === currentUser?.id}
                        onClick={() => setDeleteTarget(usr)}
                        className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all border border-slate-100 hover:border-red-100 disabled:opacity-40 disabled:hover:bg-transparent"
                        title={usr.id === currentUser?.id ? 'คุณไม่สามารถลบตัวเองได้' : 'ลบผู้ใช้'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="เพิ่มผู้ดูแลระบบคนใหม่" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="กรอกชื่อและนามสกุล"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">อีเมลติดต่อ <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@demotrack.com"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">ตำแหน่ง / Role <span className="text-red-500">*</span></label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            >
              <option value="ADMIN">แอดมิน (Admin)</option>
              <option value="IT_SUPPORT">IT Support</option>
              <option value="SALES">เซลล์ (Sales)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสผ่านสำหรับเข้าสู่ระบบ <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-200"
            >
              {submitLoading ? 'กำลังสร้าง...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="แก้ไขข้อมูลผู้ใช้ระบบ" size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="กรอกชื่อและนามสกุล"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">อีเมลติดต่อ <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@demotrack.com"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">ตำแหน่ง / Role <span className="text-red-500">*</span></label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            >
              <option value="ADMIN">แอดมิน (Admin)</option>
              <option value="IT_SUPPORT">IT Support</option>
              <option value="SALES">เซลล์ (Sales)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสผ่านใหม่ (ปล่อยว่างหากไม่ต้องการเปลี่ยน)</label>
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-200"
            >
              {submitLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบผู้ใช้ระบบ"
        message={`คุณต้องการลบข้อมูลสิทธิ์ของ "${deleteTarget?.name}" หรือไม่? เขาจะไม่สามารถลงชื่อเข้าใช้ระบบนี้ได้อีกต่อไป`}
        confirmLabel="ยืนยันการลบ"
        danger
      />

    </div>
  );
}
