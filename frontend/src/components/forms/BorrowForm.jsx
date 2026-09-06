import { useState } from 'react';

/**
 * BorrowForm — ฟอร์มบันทึกการยืมอุปกรณ์
 */
export default function BorrowForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    assetCode: '',
    borrowerName: '',
    borrowerPhone: '',
    dueDate: '',
    notes: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  // Default dueDate to 7 days from now
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* รหัสอุปกรณ์ */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          รหัสอุปกรณ์ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="assetCode"
          value={form.assetCode}
          onChange={handleChange}
          placeholder="เช่น DT-A001"
          required
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ชื่อผู้ยืม */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อผู้ยืม <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="borrowerName"
            value={form.borrowerName}
            onChange={handleChange}
            placeholder="ชื่อ-นามสกุล"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
        </div>

        {/* เบอร์โทร */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            เบอร์โทรศัพท์ <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="borrowerPhone"
            value={form.borrowerPhone}
            onChange={handleChange}
            placeholder="0XX-XXX-XXXX"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      {/* กำหนดส่งคืน */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          กำหนดส่งคืน <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          name="dueDate"
          value={form.dueDate}
          onChange={handleChange}
          min={getMinDate()}
          required
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
        />
      </div>

      {/* หมายเหตุ */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          หมายเหตุ
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          placeholder="ระบุเหตุผลการยืม (ถ้ามี)"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow resize-none"
        />
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
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกการยืม'}
        </button>
      </div>
    </form>
  );
}
