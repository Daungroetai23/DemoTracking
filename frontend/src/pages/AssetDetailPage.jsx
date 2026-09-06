import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, formatDateShort, PLACEHOLDER_IMAGE } from '../utils/helpers';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadAssetDetails();
  }, [id]);

  const loadAssetDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/assets/${id}`);
      setAsset(data);
      setActiveImageIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!asset) return <div className="text-center py-12">ไม่พบข้อมูลอุปกรณ์</div>;

  // Prepare images array
  const imagesList = asset.images && asset.images.length > 0
    ? asset.images.map(img => img.imageUrl)
    : [asset.imageUrl || PLACEHOLDER_IMAGE];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link to="/assets" className="hover:text-blue-600 transition-colors">อุปกรณ์</Link>
        <span>&gt;</span>
        <span className="text-slate-600">{asset.assetCode}</span>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Multi-Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 p-4 min-h-[300px] relative">
              <img
                src={imagesList[activeImageIndex]}
                alt={asset.name}
                className="max-h-72 max-w-full object-contain rounded-xl shadow-sm border border-slate-150"
              />
              {imagesList.length > 1 && (
                <span className="absolute bottom-4 right-4 bg-slate-800/75 text-white px-2.5 py-1 rounded-md text-xxs font-bold">
                  รูปที่ {activeImageIndex + 1} จาก {imagesList.length}
                </span>
              )}
            </div>

            {/* Thumbnail Grid */}
            {imagesList.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-square bg-white border rounded-lg p-1 overflow-hidden transition-all ${
                      idx === activeImageIndex
                        ? 'border-blue-500 ring-2 ring-blue-100'
                        : 'border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Specs info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{asset.assetCode}</h1>
                <StatusBadge status={asset.status} />
              </div>
              <p className="text-sm font-bold text-slate-500 mt-1">{asset.name}</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-semibold">ประเภท:</span>
                <span className="text-slate-700 font-bold">{asset.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-semibold">Serial Number:</span>
                <span className="text-slate-700 font-bold font-mono">{asset.serialNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-semibold">วันที่รับเข้า:</span>
                <span className="text-slate-700 font-bold">{formatDate(asset.dateAdded)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-semibold">ตำแหน่งจัดเก็บ:</span>
                <span className="text-slate-700 font-bold">{asset.location}</span>
              </div>
              {asset.pdfUrl && (
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-slate-400 font-semibold">เอกสารสเปก / คู่มือ:</span>
                  <a
                    href={asset.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 font-bold text-xs hover:bg-red-100 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    ดูเอกสาร PDF
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">ประวัติการยืม</h3>
        
        {!asset.transactions || asset.transactions.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">เครื่องนี้ยังไม่มีประวัติการทำรายการยืม-คืน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold">
                  <th className="px-4 py-3">วันที่ยืม</th>
                  <th className="px-4 py-3">กำหนดส่งคืน</th>
                  <th className="px-4 py-3">ชื่อลูกค้า</th>
                  <th className="px-4 py-3 text-center">สถานะ</th>
                  <th className="px-4 py-3 text-right">วันที่คืนจริง</th>
                </tr>
              </thead>
              <tbody>
                {asset.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-600">{formatDateShort(t.borrowDate)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-500">{formatDateShort(t.dueDate)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{t.borrowerName}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={t.status} type="transaction" />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-600">
                      {t.returnDate ? formatDateShort(t.returnDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
