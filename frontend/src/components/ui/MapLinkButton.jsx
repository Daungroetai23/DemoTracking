import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

/**
 * ปุ่มเปิดดูพิกัด/สถานที่ใน Google Maps
 * @param {string} location - ชื่อสถานที่ หรือพิกัด "lat, lng" หรือข้อความระบุตำแหน่ง
 * @param {string} className - คลาสตกแต่งเพิ่มเติม
 * @param {boolean} showText - แสดงข้อความกำกับหรือไม่ (default: true)
 */
export default function MapLinkButton({ location, className = '', showText = true }) {
  if (!location || typeof location !== 'string' || !location.trim()) {
    return null;
  }

  const trimmed = location.trim();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`เปิดดู "${trimmed}" ใน Google Maps`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 text-xs font-semibold transition-all border border-blue-100 shadow-xs group ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
      {showText && <span className="truncate max-w-[120px]">ดูแผนที่</span>}
      <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
    </a>
  );
}
