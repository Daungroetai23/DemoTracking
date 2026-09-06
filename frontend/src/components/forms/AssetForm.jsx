import { useState, useEffect } from 'react';
import { CATEGORIES as STATIC_CATEGORIES } from '../../utils/helpers';
import { X, Plus, ImageIcon } from 'lucide-react';
import api from '../../api/client';

/**
 * แปลงไฟล์รูปภาพเป็น WebP พร้อมบีบอัดขนาดในฝั่งบราวเซอร์
 */
const convertToWebP = (file, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // จำกัดขนาดภาพไม่ให้เกิน 1200px ด้านที่ยาวที่สุด เพื่อประหยัดพื้นที่และโหลดเร็ว
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // แปลงเป็น WebP พร้อมบีบอัดความละเอียด
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      };
      img.onerror = () => reject(new Error('ไม่สามารถโหลดภาพนี้ได้'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });
};

const CATEGORY_PREFIXES = {
  'ทีวี/หน้าจออัจฉริยะ': 'TV',
  'จอคอมพิวเตอร์/มอนิเตอร์': 'MON',
  'โปรเจคเตอร์': 'PRJ',
  'โน้ตบุ๊ก/แท็บเล็ต': 'NB',
  'อุปกรณ์คอมพิวเตอร์/IT': 'IT',
  'เครื่องมือวัด/ทดสอบ': 'TST',
  'อุปกรณ์เครือข่าย/เน็ตเวิร์ก': 'NET',
  'กล้อง/อุปกรณ์บันทึกภาพ': 'CAM',
  'อื่น ๆ': 'ETC'
};

/**
 * AssetForm — ฟอร์มเพิ่ม/แก้ไขอุปกรณ์ (รองรับหลายรูปภาพ)
 */
export default function AssetForm({ asset, assets, onSubmit, onCancel, loading }) {
  const [categories, setCategories] = useState(STATIC_CATEGORIES);
  const [processingImages, setProcessingImages] = useState(false);
  const [form, setForm] = useState({
    assetCode: '',
    name: '',
    category: STATIC_CATEGORIES[0],
    serialNumber: '',
    spec: '',
    location: '',
    imageUrl: '',
    pdfUrl: '',
    images: [], // array of base64 data URLs
    status: 'READY',
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.get('/categories');
        if (data && data.length > 0) {
          const names = data.map(c => c.name);
          setCategories(names);
          if (!asset) {
            setForm(prev => ({ ...prev, category: names[0] }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories in AssetForm', err);
      }
    };
    fetchCategories();
  }, [asset]);

  useEffect(() => {
    // วิ่งเฉพาะตอนสร้างอุปกรณ์ใหม่ (!asset) และมีรายการอุปกรณ์ (assets) ส่งเข้ามา
    if (!asset && assets && categories.length > 0) {
      const prefix = CATEGORY_PREFIXES[form.category] || 'AST';
      
      // ค้นหาอุปกรณ์ที่มีรหัสขึ้นต้นด้วย prefix นี้
      const matches = assets.filter(a => a.assetCode && a.assetCode.startsWith(`${prefix}-`));
      
      let nextNumber = 1;
      if (matches.length > 0) {
        const numbers = matches.map(a => {
          const part = a.assetCode.substring(prefix.length + 1);
          const num = parseInt(part, 10);
          return isNaN(num) ? 0 : num;
        });
        nextNumber = Math.max(...numbers) + 1;
      }
      
      const formattedCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
      
      setForm(prev => ({ ...prev, assetCode: formattedCode }));
    }
  }, [form.category, asset, assets, categories]);

  useEffect(() => {
    if (asset) {
      // Extract existing images from asset.images relation
      const existingImages = asset.images && asset.images.length > 0
        ? asset.images.map(img => img.imageUrl)
        : asset.imageUrl ? [asset.imageUrl] : [];

      setForm({
        assetCode: asset.assetCode || '',
        name: asset.name || '',
        category: asset.category || (categories.length > 0 ? categories[0] : ''),
        serialNumber: asset.serialNumber || '',
        spec: asset.spec || '',
        location: asset.location || '',
        imageUrl: asset.imageUrl || '',
        pdfUrl: asset.pdfUrl || '',
        images: existingImages,
        status: asset.status || 'READY',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageAdd = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Limit to 5 images total
    const remaining = 5 - form.images.length;
    const filesToProcess = files.slice(0, remaining);

    if (filesToProcess.length < files.length) {
      alert('จำกัดรูปภาพสูงสุด 5 รูปต่อ 1 อุปกรณ์');
    }

    setProcessingImages(true);
    for (const file of filesToProcess) {
      try {
        // แปลงภาพเป็น WebP และลดขนาดให้เหลือขนาดประหยัดพื้นที่ก่อนเพิ่มใน state
        const webpDataUrl = await convertToWebP(file, 0.75);
        setForm(prev => ({
          ...prev,
          images: [...prev.images, webpDataUrl],
          imageUrl: prev.images.length === 0 ? webpDataUrl : prev.imageUrl
        }));
      } catch (err) {
        console.error(err);
        alert(`ไม่สามารถนำเข้าภาพ "${file.name}" ได้: ${err.message}`);
      }
    }
    setProcessingImages(false);

    // Reset input
    e.target.value = '';
  };

  const handleImageRemove = (index) => {
    setForm(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        imageUrl: newImages.length > 0 ? newImages[0] : ''
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      imageUrl: form.images.length > 0 ? form.images[0] : form.imageUrl
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* รหัสอุปกรณ์ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            รหัสอุปกรณ์ {!asset && <span className="text-[10px] text-blue-600 font-semibold">(สร้างให้อัตโนมัติ)</span>} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="assetCode"
            value={form.assetCode}
            onChange={handleChange}
            placeholder="สร้างให้อัตโนมัติ"
            required
            disabled={!asset}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed font-semibold"
          />
        </div>

        {/* ชื่ออุปกรณ์ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ชื่ออุปกรณ์ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="ชื่ออุปกรณ์"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
        </div>

        {/* หมวดหมู่ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            หมวดหมู่ <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow bg-white font-semibold"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* สถานะอุปกรณ์ (แสดงเฉพาะขั้นตอนแก้ไข) */}
        {asset ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              สถานะอุปกรณ์ <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow bg-white font-semibold text-slate-700"
            >
              <option value="READY">พร้อมใช้งาน (READY)</option>
              <option value="BORROWED">ถูกยืม (BORROWED)</option>
              <option value="MAINTENANCE">ซ่อมบำรุง (MAINTENANCE)</option>
            </select>
          </div>
        ) : (
          /* Serial Number */
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หมายเลขซีเรียล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              placeholder="Serial Number"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
          </div>
        )}

        {/* Serial Number (ย้ายมาแสดงแยกด้านล่างหากอยู่ในขั้นตอนแก้ไข) */}
        {asset && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หมายเลขซีเรียล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              placeholder="Serial Number"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
          </div>
        )}

        {/* ตำแหน่งจัดเก็บ */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ตำแหน่งจัดเก็บ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="เช่น ที่จัดเก็บอุปกรณ์"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
        </div>

        {/* รูปภาพอุปกรณ์ — Multi Image Upload */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            รูปภาพอุปกรณ์ <span className="text-[10px] text-slate-400 font-normal">(สูงสุด 5 รูป)</span>
          </label>
          
          <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            {/* Image Gallery Grid */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-5 gap-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <img
                      src={img}
                      alt={`รูปที่ ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[8px] font-bold">
                        หลัก
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleImageRemove(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {form.images.length < 5 && (
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAdd}
                  className="hidden"
                  id="asset-images-file"
                  disabled={processingImages}
                />
                <label
                  htmlFor={processingImages ? undefined : "asset-images-file"}
                  className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors bg-white
                    ${processingImages ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  {processingImages ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-500 border-t-transparent" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {processingImages ? 'กำลังบีบอัดรูปภาพ...' : 'เพิ่มรูปภาพ...'}
                </label>
                <p className="text-[10px] text-slate-400 font-semibold">
                  รองรับ PNG, JPG, WebP ขนาดไม่เกิน 5MB ต่อรูป ({form.images.length}/5 รูป)
                </p>
              </div>
            )}

            {form.images.length === 0 && (
              <div className="flex items-center justify-center py-4 text-slate-400">
                <ImageIcon className="w-8 h-8 mr-2 opacity-40" />
                <span className="text-xs font-semibold">ยังไม่มีรูปภาพ</span>
              </div>
            )}
          </div>
        </div>

        {/* เอกสารแนบ PDF (คู่มือ / เอกสารสเปก) */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            เอกสารแนบ PDF <span className="text-[10px] text-slate-400 font-normal">(คู่มือการใช้งาน หรือเอกสารสเปกอุปกรณ์)</span>
          </label>
          <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
            {form.pdfUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">เอกสารคู่มือ/สเปกอุปกรณ์ (PDF)</p>
                    <p className="text-[10px] text-slate-400 font-semibold">พร้อมใช้งานในระบบ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, pdfUrl: '' }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="ลบเอกสาร PDF"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type !== 'application/pdf') {
                      alert('กรุณาเลือกไฟล์ PDF เท่านั้น');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setForm(prev => ({ ...prev, pdfUrl: event.target?.result || '' }));
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="asset-pdf-file"
                />
                <label
                  htmlFor="asset-pdf-file"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  แนบไฟล์ PDF...
                </label>
                <p className="text-[10px] text-slate-400 font-semibold">
                  รองรับเฉพาะไฟล์ .pdf ขนาดไม่เกิน 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* สเปค */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            รายละเอียด / สเปค
          </label>
          <textarea
            name="spec"
            value={form.spec}
            onChange={handleChange}
            rows={3}
            placeholder="รายละเอียดเพิ่มเติม"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow resize-none"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading || processingImages}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'กำลังบันทึก...' : processingImages ? 'กำลังประมวลผลรูปภาพ...' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
