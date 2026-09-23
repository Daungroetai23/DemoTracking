import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Package } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import AssetForm from '../components/forms/AssetForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { PLACEHOLDER_IMAGE } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function AssetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadAssets();
  }, [filterStatus]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      let endpoint = '/assets';
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (search) params.append('search', search);
      if (params.toString()) endpoint += `?${params.toString()}`;
      const data = await api.get(endpoint);
      setAssets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadAssets();
  };

  const handleCreate = async (form) => {
    try {
      setSubmitLoading(true);
      await api.post('/assets', form);
      setShowCreateModal(false);
      loadAssets();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = async (form) => {
    try {
      setSubmitLoading(true);
      await api.put(`/assets/${editAsset.id}`, form);
      setShowEditModal(false);
      setEditAsset(null);
      loadAssets();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/assets/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadAssets();
    } catch (err) {
      alert(err.message);
    }
  };

  // Pagination Calculation
  const totalItems = assets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssets = assets.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Add Asset Button */}
          {(user?.role === 'ADMIN' || user?.role === 'IT_SUPPORT') && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              เพิ่มอุปกรณ์
            </button>
          )}

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาอุปกรณ์..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">สถานะ:</span>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="">ทั้งหมด</option>
              <option value="READY">พร้อมใช้งาน</option>
              <option value="BORROWED">ถูกยืม</option>
              <option value="MAINTENANCE">ซ่อมบำรุง</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            ค้นหา
          </button>
        </form>
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">ไม่พบข้อมูลอุปกรณ์</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-visible shadow-sm">
          
          {/* ── Desktop Table (hidden on mobile) ── */}
          <div className="hidden lg:block overflow-visible">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold">
                  <th className="px-6 py-4">รหัสอุปกรณ์</th>
                  <th className="px-6 py-4">ชื่ออุปกรณ์</th>
                  <th className="px-6 py-4">ประเภท</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4 text-center">รูปภาพ</th>
                  <th className="px-6 py-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody> 
                {currentAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/20 transition-colors">
                    {/* Asset Code */}
                    <td className="px-6 py-4 font-bold text-slate-700">{asset.assetCode}</td>
                    
                    {/* Image & Asset Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative group cursor-zoom-in hover:z-[90]">
                          <img
                            src={asset?.images?.[0]?.imageUrl || asset?.imageUrl || PLACEHOLDER_IMAGE}
                            alt="asset"
                            className="w-12 h-9 rounded object-cover border border-slate-100 shadow-sm"
                          />
                          <div className="absolute hidden group-hover:flex items-center justify-center z-[100] bottom-full left-1/2 mb-2 p-1.5 bg-white/95 backdrop-blur-sm border border-slate-150 rounded-2xl shadow-2xl pointer-events-none w-48 h-36 origin-bottom animate-tooltip-in">
                            <img
                              src={asset?.images?.[0]?.imageUrl || asset?.imageUrl || PLACEHOLDER_IMAGE}
                              alt="preview"
                              className="max-w-full max-h-full object-contain rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-800 truncate max-w-[200px]">{asset.name}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold">{asset.spec}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 text-slate-500 font-semibold">{asset.category}</td>

                    {/* Status badge */}
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={asset.status} />
                    </td>

                    {/* Image count */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-400">
                        {asset.images ? asset.images.length : (asset.imageUrl ? 1 : 0)} รูป
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/assets/${asset.id}`)}
                          className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all border border-slate-100 hover:border-blue-100"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(user?.role === 'ADMIN' || user?.role === 'IT_SUPPORT') && (
                          <button
                            onClick={() => { setEditAsset(asset); setShowEditModal(true); }}
                            className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all border border-slate-100 hover:border-amber-100"
                            title="แก้ไข"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => setDeleteTarget(asset)}
                            className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all border border-slate-100 hover:border-red-100"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Card View (shown on mobile, hidden on desktop) ── */}
          <div className="lg:hidden divide-y divide-slate-100">
            {currentAssets.map((asset) => (
              <div key={asset.id} className="p-4 flex gap-3 items-start">
                {/* Thumbnail */}
                <img
                  src={asset?.images?.[0]?.imageUrl || asset?.imageUrl || PLACEHOLDER_IMAGE}
                  alt={asset.name}
                  className="w-16 h-12 rounded-lg object-cover border border-slate-100 shadow-sm shrink-0"
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600">{asset.assetCode}</span>
                    <StatusBadge status={asset.status} />
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">{asset.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{asset.category}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/assets/${asset.id}`)}
                    className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all border border-slate-100"
                    title="ดูรายละเอียด"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {(user?.role === 'ADMIN' || user?.role === 'IT_SUPPORT') && (
                    <button
                      onClick={() => { setEditAsset(asset); setShowEditModal(true); }}
                      className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all border border-slate-100"
                      title="แก้ไข"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setDeleteTarget(asset)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all border border-slate-100"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Pagination */}
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span>
              แสดง {totalItems > 0 ? indexOfFirstItem + 1 : 0} ถึง {Math.min(indexOfLastItem, totalItems)} จาก {totalItems} รายการ
            </span>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors
                    ${currentPage === i + 1
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="เพิ่มอุปกรณ์ใหม่" size="lg">
        <AssetForm
          assets={assets}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          loading={submitLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditAsset(null); }} title="แก้ไขอุปกรณ์" size="lg">
        <AssetForm
          asset={editAsset}
          assets={assets}
          onSubmit={handleEdit}
          onCancel={() => { setShowEditModal(false); setEditAsset(null); }}
          loading={submitLoading}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบอุปกรณ์"
        message={`คุณต้องการลบ "${deleteTarget?.name}" ออกจากระบบหรือไม่? รายการประวัติที่เกี่ยวข้องจะถูกลบออกด้วย`}
        confirmLabel="ยืนยันการลบ"
        danger
      />
    </div>
  );
}
