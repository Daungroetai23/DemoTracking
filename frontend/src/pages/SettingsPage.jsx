import React, { useState, useEffect } from 'react';
import { Settings, User, Key, Save, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function SettingsPage() {
  const { user, login } = useAuth();

  // Category management states
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addCategoryLoading, setAddCategoryLoading] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await api.get('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setCategoryMessage(null);
    if (!newCategoryName.trim()) return;

    setAddCategoryLoading(true);
    try {
      await api.post('/categories', { name: newCategoryName });
      setCategoryMessage({ type: 'success', text: 'เพิ่มหมวดหมู่สำเร็จเรียบร้อยแล้ว!' });
      setNewCategoryName('');
      loadCategories();
    } catch (err) {
      setCategoryMessage({ type: 'danger', text: err.message || 'ไม่สามารถเพิ่มหมวดหมู่ได้' });
    } finally {
      setAddCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setCategoryMessage(null);
    try {
      await api.delete(`/categories/${deleteCategoryTarget.id}`);
      setCategoryMessage({ type: 'success', text: `ลบหมวดหมู่ "${deleteCategoryTarget.name}" สำเร็จเรียบร้อยแล้ว!` });
      setDeleteCategoryTarget(null);
      loadCategories();
    } catch (err) {
      setCategoryMessage({ type: 'danger', text: err.message || 'ไม่สามารถลบหมวดหมู่ได้' });
      setDeleteCategoryTarget(null);
    }
  };
  
  // Profile update states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password update states
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileLoading(true);

    try {
      // Put directly to update user
      const updated = await api.put(`/users/${user.id}`, profileForm);
      
      // Update local storage user details (using login wrapper helper if applicable, or local context updates)
      const token = localStorage.getItem('token');
      localStorage.setItem('user', JSON.stringify({
        ...user,
        name: updated.name,
        email: updated.email
      }));
      
      // Force trigger local context update by page refresh or state change
      setProfileMessage({ type: 'success', text: 'อัปเดตข้อมูลผู้ใช้งานส่วนตัวเรียบร้อยแล้ว! (รีโหลดเบราว์เซอร์เพื่อแสดงผล)' });
    } catch (err) {
      setProfileMessage({ type: 'danger', text: err.message || 'ไม่สามารถบันทึกการแก้ไขข้อมูลได้' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'danger', text: 'รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }

    setPasswordLoading(true);
    try {
      // Endpoint to update password. We reuse the PUT user endpoint
      await api.put(`/users/${user.id}`, {
        password: passwordForm.newPassword
      });

      setPasswordMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านเข้าใช้งานระบบเรียบร้อยแล้ว!' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ type: 'danger', text: err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-800">ตั้งค่าระบบและบัญชีผู้ใช้งาน</h1>
          <p className="text-[10px] text-slate-400 font-bold">แก้ไขข้อมูลส่วนตัว เปลี่ยนรหัสผ่าน และปรับปรุงสิทธิ์ของคุณ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Personal Profile Settings */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-2.5 border-b border-slate-50">
              <User className="w-4.5 h-4.5 text-slate-400" />
              แก้ไขข้อมูลส่วนตัว
            </h3>

            {profileMessage && (
              <div className={`p-3 rounded-xl border text-xs font-bold
                ${profileMessage.type === 'success'
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อ-นามสกุล</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">อีเมลผู้ใช้งาน</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-200"
              >
                <Save className="w-3.5 h-3.5" />
                {profileLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Change Password */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-2.5 border-b border-slate-50">
              <Key className="w-4.5 h-4.5 text-slate-400" />
              เปลี่ยนรหัสผ่านความปลอดภัย
            </h3>

            {passwordMessage && (
              <div className={`p-3 rounded-xl border text-xs font-bold
                ${passwordMessage.type === 'success'
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสผ่านใหม่</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="กรอกยืนยันรหัสผ่านใหม่อีกครั้ง"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-200"
              >
                <Save className="w-3.5 h-3.5" />
                {passwordLoading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Category Management */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-50">
          <Settings className="w-4.5 h-4.5 text-slate-400" />
          การจัดการหมวดหมู่อุปกรณ์
        </h3>

        {/* Status/Error messages */}
        {categoryMessage && (
          <div className={`mt-3 p-3 rounded-xl border text-xs font-bold
            ${categoryMessage.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            {categoryMessage.text}
          </div>
        )}

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              required
              placeholder="กรอกชื่อหมวดหมู่ใหม่ เช่น อุปกรณ์เสริม"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-700"
            />
          </div>
          <button
            type="submit"
            disabled={addCategoryLoading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-200 shrink-0"
          >
            {addCategoryLoading ? 'กำลังเพิ่ม...' : 'เพิ่มหมวดหมู่'}
          </button>
        </form>

        {/* Categories List */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-400 mb-3">หมวดหมู่ทั้งหมดในระบบ</h4>
          {categoriesLoading ? (
            <div className="text-center py-6 text-xs font-bold text-slate-400">กำลังโหลด...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-slate-400">ไม่มีข้อมูลหมวดหมู่</div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-600 text-xs font-semibold"
                >
                  <span>{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteCategoryTarget(cat)}
                    className="p-0.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="ลบหมวดหมู่"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Category Confirm */}
      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={handleDeleteCategory}
        title="ยืนยันการลบหมวดหมู่"
        message={`คุณต้องการลบหมวดหมู่ "${deleteCategoryTarget?.name}" หรือไม่? การลบจะทำได้เมื่อไม่มีอุปกรณ์ใดๆ ใช้งานหมวดหมู่นี้อยู่เท่านั้น`}
        confirmLabel="ยืนยันการลบ"
        danger
      />

    </div>
  );
}
