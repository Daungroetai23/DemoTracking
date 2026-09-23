import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MapPin, Navigation, Check, Loader2, ExternalLink } from 'lucide-react';
import L from 'leaflet';

// กำหนดไอคอนหมุดแบบ SVG ที่คมชัด และไม่พึ่งพาไฟล์ PNG ภายนอก
const createPinIcon = () => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
      ">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });
};

// พิกัดเริ่มต้น: ใจกลางกรุงเทพฯ
const DEFAULT_CENTER = [13.7563, 100.5018];
const DEFAULT_ZOOM = 13;

/**
 * แปลงข้อมูล Nominatim ให้เป็นชื่อสถานที่ที่อ่านง่าย
 */
const formatNominatimAddress = (data) => {
  if (!data) return '';
  if (data.display_name) {
    const addr = data.address || {};
    const parts = [];

    // ชื่อสถานที่ / ตึก / หมู่บ้าน
    const placeName = addr.amenity || addr.building || addr.office || addr.shop || addr.tourism || addr.leisure || addr.industrial || data.name;
    if (placeName) parts.push(placeName);

    // ถนน / ซอย
    const road = addr.road || addr.street;
    if (road && !parts.includes(road)) parts.push(road);

    // แขวง/ตำบล
    const subdistrict = addr.suburb || addr.subdistrict || addr.quarter;
    if (subdistrict && !parts.includes(subdistrict)) parts.push(subdistrict);

    // เขต/อำเภอ
    const district = addr.city_district || addr.district || addr.county || addr.city;
    if (district && !parts.includes(district)) parts.push(district);

    // จังหวัด
    const province = addr.state || addr.province;
    if (province && !parts.includes(province)) parts.push(province);

    if (parts.length > 0) {
      return parts.join(', ');
    }
    return data.display_name.split(',').slice(0, 4).join(',');
  }
  return '';
};

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation = '',
  title = 'เลือกสถานที่บนแผนที่'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    name: initialLocation || '',
    lat: DEFAULT_CENTER[0],
    lng: DEFAULT_CENTER[1]
  });

  // ซิงค์ initialLocation เมื่อเปิด modal
  useEffect(() => {
    if (isOpen) {
      setSelectedLocation({
        name: initialLocation || '',
        lat: DEFAULT_CENTER[0],
        lng: DEFAULT_CENTER[1]
      });
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialLocation]);

  // ตั้งค่าและสร้างแผนที่ Leaflet เมื่อ modal เปิด
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // ถ้ามี map ตัวเก่าอยู่แล้ว ให้ทำลายก่อน
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true
    });
    mapInstanceRef.current = map;

    // โหลด Tile Layer ของ OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // ปักหมุดเริ่มต้น
    const marker = L.marker(DEFAULT_CENTER, {
      icon: createPinIcon(),
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    // อีเวนต์เมื่อคลิกบนแผนที่
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      updateMarkerPosition(lat, lng, true);
    });

    // อีเวนต์เมื่อลากหมุดไปปล่อย
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      updateMarkerPosition(pos.lat, pos.lng, true);
    });

    // Invalidate size หลังจากเรนเดอร์ใน DOM เพื่อป้องกันแผนที่แสดงผลผิดสัดส่วน
    const timer = setTimeout(() => {
      map.invalidateSize();

      // ถ้ามี initialLocation ลองค้นหาให้อัตโนมัติ
      if (initialLocation && initialLocation.trim()) {
        searchPlace(initialLocation.trim(), false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // อัปเดตตำแหน่งหมุดและ Reverse Geocoding
  const updateMarkerPosition = async (lat, lng, fetchAddress = true) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng]);
    }

    setSelectedLocation(prev => ({
      ...prev,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    }));

    if (fetchAddress) {
      setIsGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'th, en' } }
        );
        const data = await res.json();
        const address = formatNominatimAddress(data) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setSelectedLocation({
          name: address,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        });
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      } finally {
        setIsGeocoding(false);
      }
    }
  };

  // ค้นหาสถานที่ผ่าน Nominatim API
  const searchPlace = async (queryText, showDropdown = true) => {
    if (!queryText || !queryText.trim()) return;
    setIsSearching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&countrycodes=th&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'th, en' } }
      );
      const results = await res.json();

      if (results && results.length > 0) {
        if (showDropdown) {
          setSearchResults(results);
        } else {
          // เลือกผลลัพธ์แรกทันที
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          const name = formatNominatimAddress(first) || first.display_name;

          setSelectedLocation({ name, lat, lng: lon });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lon], 16);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          }
        }
      } else if (showDropdown) {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchPlace(searchQuery, true);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const name = formatNominatimAddress(result) || result.display_name;

    setSelectedLocation({ name, lat, lng: lon });
    setSearchResults([]);
    setSearchQuery(name);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 16);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    }
  };

  // ดึงตำแหน่งปัจจุบันของผู้ใช้ (GPS)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16);
        }
        updateMarkerPosition(latitude, longitude, true);
      },
      (err) => {
        setIsGeocoding(false);
        alert('ไม่สามารถดึงตำแหน่งปัจจุบันได้: ' + (err.message || 'โปรดอนุญาตสิทธิ์เข้าถึงตำแหน่ง'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ยืนยันการเลือกสถานที่
  const handleConfirm = () => {
    if (onSelectLocation) {
      onSelectLocation({
        name: selectedLocation.name || `${selectedLocation.lat}, ${selectedLocation.lng}`,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        mapsUrl: `https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">{title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">ค้นหาหรือคลิกบนแผนที่เพื่อปักหมุด</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & GPS Button */}
        <div className="p-3 border-b border-slate-100 bg-white relative z-10">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อสถานที่, อาคาร, บริษัท, ถนน..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>ค้นหา</span>
            </button>

            <button
              type="button"
              onClick={handleGetCurrentLocation}
              title="ดึงพิกัด GPS ตำแหน่งปัจจุบันของคุณ"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-200 shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">ตำแหน่งของฉัน</span>
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-20">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors flex items-start gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {item.name || item.display_name.split(',')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {item.display_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Geocoding indicator overlay */}
          {isGeocoding && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-xs z-10 animate-fadeIn">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>กำลังดึงชื่อสถานที่...</span>
            </div>
          )}
        </div>

        {/* Footer / Selected Location Confirmation */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              ชื่อสถานที่ / ที่อยู่ที่เลือก (แก้ไขข้อความได้ตามต้องการ):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={selectedLocation.name}
                onChange={(e) => setSelectedLocation(prev => ({ ...prev, name: e.target.value }))}
                placeholder="คลิกบนแผนที่เพื่อเลือกตำแหน่ง..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedLocation.lat && (
                <a
                  href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200 shrink-0"
                  title="เปิดดูตำแหน่งนี้ใน Google Maps"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Google Maps</span>
                </a>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              พิกัด: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedLocation.name && !selectedLocation.lat}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-100"
            >
              <Check className="w-4 h-4" />
              <span>ยืนยันสถานที่นี้</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
