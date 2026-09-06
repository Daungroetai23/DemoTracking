/**
 * DemoTrack Utility Functions
 * Format dates, map statuses to Thai text & colors
 */

// ──────────────────────────────────────────
// Date formatting
// ──────────────────────────────────────────

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
}

export function getLocalDateString(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
}

// ──────────────────────────────────────────
// Asset status mapping
// ──────────────────────────────────────────

const ASSET_STATUS_MAP = {
  READY: {
    label: 'พร้อมใช้งาน',
    color: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
    dot: 'bg-emerald-500',
  },
  BORROWED: {
    label: 'ถูกยืม',
    color: 'bg-purple-50 text-purple-700 border border-purple-100',
    dot: 'bg-purple-500',
  },
  MAINTENANCE: {
    label: 'ซ่อมบำรุง',
    color: 'bg-red-50 text-red-700 border border-red-100',
    dot: 'bg-red-500',
  },
};

export function getAssetStatus(status) {
  return ASSET_STATUS_MAP[status] || { label: status, color: 'bg-slate-50 text-slate-600 border border-slate-100', dot: 'bg-slate-400' };
}

// ──────────────────────────────────────────
// Transaction status mapping
// ──────────────────────────────────────────

const TRANSACTION_STATUS_MAP = {
  ACTIVE: {
    label: 'ถูกยืม',
    color: 'bg-purple-50 text-purple-700 border border-purple-100',
    dot: 'bg-purple-500',
  },
  RETURNED: {
    label: 'คืนแล้ว',
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    dot: 'bg-emerald-500',
  },
  OVERDUE: {
    label: 'เกินกำหนด',
    color: 'bg-rose-50 text-rose-700 border border-rose-100',
    dot: 'bg-rose-500',
  },
};

export function getTransactionStatus(status) {
  return TRANSACTION_STATUS_MAP[status] || { label: status, color: 'bg-slate-50 text-slate-600 border border-slate-100', dot: 'bg-slate-400' };
}

// ──────────────────────────────────────────
// Role mapping — 3 ตำแหน่ง
// ──────────────────────────────────────────

const ROLE_MAP = {
  ADMIN: { label: 'แอดมิน', color: 'bg-blue-50 text-blue-700 border border-blue-100' },
  IT_SUPPORT: { label: 'IT Support', color: 'bg-violet-50 text-violet-700 border border-violet-100' },
  SALES: { label: 'เซลล์', color: 'bg-amber-50 text-amber-700 border border-amber-100' },
};

export function getRoleLabel(role) {
  return ROLE_MAP[role]?.label || 'ผู้ดูแลระบบ';
}

export function getRoleInfo(role) {
  return ROLE_MAP[role] || ROLE_MAP.ADMIN;
}

// ──────────────────────────────────────────
// Category list (for select dropdowns)
// ──────────────────────────────────────────

export const CATEGORIES = [
  'ทีวี',
  'จอคอมพิวเตอร์',
  'โปรเจคเตอร์',
  'ชุดฝึกปฏิบัติการ',
  'อุปกรณ์คอมพิวเตอร์',
  'เครื่องมือวัด',
  'เครื่องพิมพ์และแปรรูป',
  'อุปกรณ์สื่อการสอน',
  'อื่น ๆ',
];

// ──────────────────────────────────────────
// Placeholder image สำหรับอุปกรณ์ที่ยังไม่มีรูปภาพ
// ──────────────────────────────────────────
export const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='none'%3E%3Crect width='400' height='300' rx='16' fill='%23f1f5f9'/%3E%3Cpath d='M172 130a28 28 0 1 1 56 0 28 28 0 0 1-56 0Z' fill='%23cbd5e1'/%3E%3Cpath d='M128 195l40-50a8 8 0 0 1 12.5 0l30 37.5 20-25a8 8 0 0 1 12.5 0L272 195' stroke='%23cbd5e1' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ctext x='200' y='230' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14' font-weight='600'%3Eไม่มีรูปภาพ%3C/text%3E%3C/svg%3E";
