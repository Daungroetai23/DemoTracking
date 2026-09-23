import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRightLeft, Check, AlertCircle, MapPin } from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LocationPickerModal from '../components/ui/LocationPickerModal';
import { PLACEHOLDER_IMAGE, getLocalDateString } from '../utils/helpers';

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('borrow'); // 'borrow' or 'return'
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [mapTarget, setMapTarget] = useState(null); // 'borrowLocationFrom' | 'borrowLocationTo' | 'returnLocation'

  // Forms states
  const [borrowForm, setBorrowForm] = useState({
    assetCode: '',
    borrowerName: '',
    customerName: '',
    salesTeam: '',
    department: '',
    organization: '',
    borrowDate: getLocalDateString(new Date()),
    dueDate: '',
    locationFrom: '',
    locationTo: '',
    notes: '',
  });

  const [returnForm, setReturnForm] = useState({
    assetCode: '',
    returnLocation: '',
    notes: '',
  });

  useEffect(() => {
    const init = async () => {
      const data = await loadAssets();
      
      const queryParams = new URLSearchParams(location.search);
      const code = location.state?.scanCode || queryParams.get('scanCode');
      
      if (data && code) {
        const matchedAsset = data.find(a => a.assetCode === code);
        
        if (matchedAsset) {
          if (matchedAsset.status === 'READY') {
            setActiveTab('borrow');
            setBorrowForm(prev => ({ 
              ...prev, 
              assetCode: code,
              locationFrom: matchedAsset.location || ''
            }));
          } else if (matchedAsset.status === 'BORROWED') {
            setActiveTab('return');
            setReturnForm(prev => ({ ...prev, assetCode: code }));
          }
        }
      }
    };
    init();

    // Default dueDate to 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setBorrowForm(prev => ({ ...prev, dueDate: getLocalDateString(d) }));
  }, [location.search, location.state]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.get('/assets');
      setAssets(data);
      return data;
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill locationFrom when asset is selected
  const handleBorrowAssetChange = (assetCode) => {
    const asset = assets.find(a => a.assetCode === assetCode);
    setBorrowForm(prev => ({
      ...prev,
      assetCode,
      locationFrom: asset ? asset.location : ''
    }));
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      setSubmitLoading(true);
      await api.post('/transactions/borrow', borrowForm);
      setMessage({ type: 'success', text: 'บันทึกรายการยืมอุปกรณ์สำเร็จ!' });
      setBorrowForm({
        assetCode: '',
        borrowerName: '',
        customerName: '',
        salesTeam: '',
        department: '',
        organization: '',
        borrowDate: getLocalDateString(new Date()),
        dueDate: getLocalDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        locationFrom: '',
        locationTo: '',
        notes: '',
      });
      loadAssets();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'เกิดข้อผิดพลาดในการทำรายการ' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      setSubmitLoading(true);
      await api.post('/transactions/return', returnForm);
      setMessage({ type: 'success', text: 'บันทึกรายการส่งคืนอุปกรณ์สำเร็จ!' });
      setReturnForm({
        assetCode: '',
        returnLocation: '',
        notes: '',
      });
      loadAssets();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'เกิดข้อผิดพลาดในการทำรายการ' });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Filter lists based on status
  const readyAssets = assets.filter(a => a.status === 'READY');
  const borrowedAssets = assets.filter(a => a.status === 'BORROWED');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Tab Switcher */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex shadow-sm">
        <button
          onClick={() => { setActiveTab('borrow'); setMessage(null); }}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
            ${activeTab === 'borrow'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          ยืมอุปกรณ์
        </button>
        <button
          onClick={() => { setActiveTab('return'); setMessage(null); }}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
            ${activeTab === 'return'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <ArrowRightLeft className="w-4 h-4 rotate-180" />
          คืนอุปกรณ์
        </button>
      </div>

      {/* Message alert */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm text-sm font-bold
          ${message.type === 'success'
            ? 'bg-green-50 border-green-100 text-green-700'
            : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Card Content */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-md">
        {activeTab === 'borrow' ? (
          /* Borrow Form */
          <form onSubmit={handleBorrowSubmit} className="space-y-5">
            <h2 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-2">ยืมอุปกรณ์</h2>

            {/* Asset Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสอุปกรณ์ / อุปกรณ์ที่ต้องการยืม</label>
              <select
                required
                value={borrowForm.assetCode}
                onChange={(e) => handleBorrowAssetChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
              >
                <option value="">เลือกอุปกรณ์ที่ต้องการยืม (ที่พร้อมใช้งาน)</option>
                {readyAssets.map(a => (
                  <option key={a.id} value={a.assetCode}>{a.assetCode} - {a.name} ({a.location})</option>
                ))}
              </select>

              {/* Asset Preview Card */}
              {borrowForm.assetCode && (
                (() => {
                  const asset = assets.find(a => a.assetCode === borrowForm.assetCode);
                  if (!asset) return null;
                  return (
                    <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 shadow-sm animate-fadeIn">
                      <div className="w-24 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-sm">
                        <img
                          src={asset?.images?.[0]?.imageUrl || asset?.imageUrl || PLACEHOLDER_IMAGE}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold font-mono">
                            {asset.assetCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-bold">
                            {asset.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 truncate">{asset.name}</h4>
                        <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">S/N: {asset.serialNumber || '-'}</p>
                        <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">ตำแหน่งจัดเก็บ: {asset.location}</p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Borrower Name (ชื่อลูกค้า) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อลูกค้าที่ยืมอุปกรณ์</label>
              <input
                type="text"
                required
                placeholder="ระบุชื่อลูกค้า หรือบริษัท/หน่วยงานผู้ยืม"
                value={borrowForm.borrowerName}
                onChange={(e) => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
              />
            </div>

            {/* Sales Team / Department / Organization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ทีมเซลล์ที่ยืม</label>
                <input
                  type="text"
                  placeholder="ทีมเซลล์"
                  value={borrowForm.salesTeam}
                  onChange={(e) => setBorrowForm({ ...borrowForm, salesTeam: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">แผนกที่ยืม</label>
                <input
                  type="text"
                  placeholder="แผนก"
                  value={borrowForm.department}
                  onChange={(e) => setBorrowForm({ ...borrowForm, department: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อหน่วยงาน</label>
                <input
                  type="text"
                  placeholder="หน่วยงาน"
                  value={borrowForm.organization}
                  onChange={(e) => setBorrowForm({ ...borrowForm, organization: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                />
              </div>
            </div>

            {/* Location From / To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500">
                    <MapPin className="w-3 h-3 inline mr-1" />ตำแหน่งจัดเก็บ (ต้นทาง)
                  </label>
                  <button
                    type="button"
                    onClick={() => setMapTarget('borrowLocationFrom')}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>แผนที่</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Auto-fill จากอุปกรณ์ หรือเลือกจากแผนที่"
                    value={borrowForm.locationFrom}
                    onChange={(e) => setBorrowForm({ ...borrowForm, locationFrom: e.target.value })}
                    className="w-full px-4 py-3 pr-20 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-slate-50 text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setMapTarget('borrowLocationFrom')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200 shadow-2xs"
                  >
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>แผนที่</span>
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500">
                    <MapPin className="w-3 h-3 inline mr-1 text-blue-600" />สถานที่ปลายทาง (นำไปที่ไหน)
                  </label>
                  <button
                    type="button"
                    onClick={() => setMapTarget('borrowLocationTo')}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>เลือกจากแผนที่</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ระบุสถานที่ปลายทาง หรือเลือกจากแผนที่"
                    value={borrowForm.locationTo}
                    onChange={(e) => setBorrowForm({ ...borrowForm, locationTo: e.target.value })}
                    className="w-full px-4 py-3 pr-20 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setMapTarget('borrowLocationTo')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-100 shadow-2xs"
                  >
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>แผนที่</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Date Fields — วันที่ยืม (จำกัดไม่ให้ยืมย้อนหลัง) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">วันที่ยืม (เริ่มต้นจากวันนี้)</label>
                <input
                  type="date"
                  required
                  min={getLocalDateString(new Date())}
                  value={borrowForm.borrowDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrowDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">วันที่ต้องส่งคืน</label>
                <input
                  type="date"
                  required
                  value={borrowForm.dueDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, dueDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">หมายเหตุ</label>
              <textarea
                placeholder="ระบุจุดประสงค์การยืม หรือรายละเอียดเพิ่มเติม..."
                rows={3}
                value={borrowForm.notes}
                onChange={(e) => setBorrowForm({ ...borrowForm, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => navigate('/assets')}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-blue-200"
              >
                {submitLoading ? 'กำลังทำรายการ...' : 'ยืนยันการยืม'}
              </button>
            </div>
          </form>
        ) : (
          /* Return Form */
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            <h2 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-2">ส่งคืนอุปกรณ์</h2>

            {/* Asset Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสอุปกรณ์ / อุปกรณ์ที่ส่งคืน</label>
              <select
                required
                value={returnForm.assetCode}
                onChange={(e) => setReturnForm({ ...returnForm, assetCode: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
              >
                <option value="">เลือกอุปกรณ์ที่ต้องการส่งคืน (ที่ถูกยืมอยู่ในขณะนี้)</option>
                {borrowedAssets.map(a => (
                  <option key={a.id} value={a.assetCode}>{a.assetCode} - {a.name}</option>
                ))}
              </select>

              {/* Asset Preview Card */}
              {returnForm.assetCode && (
                (() => {
                  const asset = assets.find(a => a.assetCode === returnForm.assetCode);
                  if (!asset) return null;
                  return (
                    <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 shadow-sm animate-fadeIn">
                      <div className="w-24 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-sm">
                        <img
                          src={asset?.images?.[0]?.imageUrl || asset?.imageUrl || PLACEHOLDER_IMAGE}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold font-mono">
                            {asset.assetCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-bold">
                            {asset.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 truncate">{asset.name}</h4>
                        <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">S/N: {asset.serialNumber || '-'}</p>
                        <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">ตำแหน่งจัดเก็บ: {asset.location}</p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Return Location — สถานที่ส่งคืน */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-500">
                  <MapPin className="w-3 h-3 inline mr-1 text-blue-600" />สถานที่ส่งกลับ
                </label>
                <button
                  type="button"
                  onClick={() => setMapTarget('returnLocation')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>เลือกจากแผนที่</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ระบุสถานที่ที่ส่งอุปกรณ์คืน หรือเลือกจากแผนที่"
                  value={returnForm.returnLocation}
                  onChange={(e) => setReturnForm({ ...returnForm, returnLocation: e.target.value })}
                  className="w-full px-4 py-3 pr-20 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setMapTarget('returnLocation')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-100 shadow-2xs"
                >
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span>แผนที่</span>
                </button>
              </div>
            </div>

            {/* Return Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">หมายเหตุการส่งคืน (เช่น สภาพอุปกรณ์ครบถ้วน)</label>
              <textarea
                placeholder="ระบุหมายเหตุหรือสภาพอุปกรณ์ขณะส่งคืน..."
                rows={3}
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => navigate('/assets')}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-blue-200"
              >
                {submitLoading ? 'กำลังทำรายการ...' : 'ยืนยันการคืน'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={Boolean(mapTarget)}
        onClose={() => setMapTarget(null)}
        initialLocation={
          mapTarget === 'borrowLocationTo'
            ? borrowForm.locationTo
            : mapTarget === 'borrowLocationFrom'
            ? borrowForm.locationFrom
            : returnForm.returnLocation
        }
        title={
          mapTarget === 'borrowLocationTo'
            ? 'เลือกสถานที่ปลายทาง (นำไปที่ไหน)'
            : mapTarget === 'borrowLocationFrom'
            ? 'เลือกตำแหน่งจัดเก็บ (ต้นทาง)'
            : 'เลือกสถานที่ส่งกลับ'
        }
        onSelectLocation={(loc) => {
          if (mapTarget === 'borrowLocationTo') {
            setBorrowForm(prev => ({ ...prev, locationTo: loc.name }));
          } else if (mapTarget === 'borrowLocationFrom') {
            setBorrowForm(prev => ({ ...prev, locationFrom: loc.name }));
          } else if (mapTarget === 'returnLocation') {
            setReturnForm(prev => ({ ...prev, returnLocation: loc.name }));
          }
        }}
      />
    </div>
  );
}
