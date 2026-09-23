import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MapPin, Navigation, Check, Loader2, ExternalLink, Clipboard } from 'lucide-react';
import L from 'leaflet';
import api from '../../api/client';

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
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
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
    return data.display_name.split(',').slice(0, 4).join(', ');
  }
  return '';
};

/**
 * ฟังก์ชันแกะพิกัดและชื่อสถานที่จาก URL Google Maps หรือข้อความพิกัด
 */
export const parseGoogleMapsOrCoords = (str) => {
  if (!str || typeof str !== 'string') return null;
  const rawText = str.trim();

  // 1. ตรวจสอบว่ามี URL แฝงอยู่ในข้อความหรือไม่ (เช่น กรณีคัดลอกจากปุ่มแชร์ Google Maps บนมือถือ)
  const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
  const text = urlMatch ? urlMatch[0] : rawText;
  const attachedName = urlMatch ? rawText.replace(urlMatch[0], '').trim() : '';

  // 2. ตรวจจับพิกัดละติจูด, ลองจิจูดโดยตรง เช่น 16.3891893, 102.808504 หรือ (16.38961, 102.8089905)
  const coordRegex = /^[\(\[]?(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)[\)\]]?$/;
  const coordMatch = text.match(coordRegex);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
      name: attachedName || `พิกัด ${coordMatch[1]}, ${coordMatch[2]}`
    };
  }

  // 3. แกะพิกัดจาก Google Maps URL
  if (
    text.includes('google.com/maps') ||
    text.includes('maps.google.com') ||
    text.includes('maps.app.goo.gl') ||
    text.includes('goo.gl/maps')
  ) {
    const pinMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qMatch = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const llMatch = text.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);

    let lat = null, lng = null;
    if (pinMatch) {
      lat = parseFloat(pinMatch[1]);
      lng = parseFloat(pinMatch[2]);
    } else if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    } else if (qMatch) {
      lat = parseFloat(qMatch[1]);
      lng = parseFloat(qMatch[2]);
    } else if (llMatch) {
      lat = parseFloat(llMatch[1]);
      lng = parseFloat(llMatch[2]);
    }

    let name = attachedName;
    const placeMatch = text.match(/\/place\/([^/@?]+)/);
    if (placeMatch && !name) {
      try {
        name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        name = placeMatch[1].replace(/\+/g, ' ');
      }
    }

    if (lat !== null && lng !== null) {
      return {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        name: name || `พิกัด ${lat.toFixed(5)}, ${lng.toFixed(5)}`
      };
    }
  }

  return null;
};

// รายชื่อพิกัดใจกลางจังหวัดหลักๆ ในไทย สำหรับการบินไปปักหมุดด่วน
const PROVINCE_COORDS = {
  'ขอนแก่น': [16.4322, 102.8236],
  'กรุงเทพ': [13.7563, 100.5018],
  'เชียงใหม่': [18.7883, 98.9853],
  'นนทบุรี': [13.8591, 100.5217],
  'ชลบุรี': [13.3611, 100.9847],
  'นครราชสีมา': [14.9799, 102.0978],
  'โคราช': [14.9799, 102.0978],
  'สงขลา': [7.1897, 100.5954],
  'หาดใหญ่': [7.0084, 100.4767],
  'ภูเก็ต': [7.8804, 98.3923],
  'ระยอง': [12.6814, 101.2816],
  'อุดรธานี': [17.4138, 102.7872],
  'พิษณุโลก': [16.8211, 100.2659],
  'อุบลราชธานี': [15.2448, 104.8473],
  'สุราษฎร์ธานี': [9.1382, 99.3216],
  'สมุทรปราการ': [13.5991, 100.5968],
  'ปทุมธานี': [14.0208, 100.5250],
  'พระนครศรีอยุธยา': [14.3532, 100.5684],
  'อยุธยา': [14.3532, 100.5684],
  'เชียงราย': [19.9072, 99.8325]
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
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    name: initialLocation || '',
    lat: DEFAULT_CENTER[0],
    lng: DEFAULT_CENTER[1]
  });

  const detectedProvince = Object.keys(PROVINCE_COORDS).find(p => searchQuery.includes(p));

  // ฟังก์ชันคลิกปุ่มวางลิงก์หรือพิกัดจากคลิปบอร์ด
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        alert('เบราว์เซอร์ไม่รองรับการอ่านคลิปบอร์ด กรุณาคลิกขวาแล้ววางลงในช่องค้นหา');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setSearchQuery(clean);
        searchPlace(clean, false);
      }
    } catch {
      alert('กรุณากดคลิกขวาแล้วเลือก "วาง" (Paste) ลงในช่องค้นหา');
    }
  };

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
      setSearchEmpty(false);
    }
  }, [isOpen, initialLocation]);

  // ตั้งค่าและสร้างแผนที่ Leaflet เมื่อ modal เปิด
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const marker = L.marker(DEFAULT_CENTER, {
      icon: createPinIcon(),
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      updateMarkerPosition(lat, lng, true);
    });

    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      updateMarkerPosition(pos.lat, pos.lng, true);
    });

    const timer = setTimeout(() => {
      map.invalidateSize();
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

  // ระบบค้นหาอัตโนมัติขณะพิมพ์ (Debounce Live Search 400ms)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchEmpty(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchPlace(searchQuery.trim(), true);
    }, 450);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

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
        // 1. ลองดึงผ่าน Backend API ก่อน (ผ่าน proxy เพื่อไม่ให้ติด User-Agent 403)
        let data = null;
        try {
          data = await api.get('/locations/reverse', {
            params: { lat: lat.toFixed(6), lng: lng.toFixed(6) }
          });
        } catch {
          // Fallback ถ้า backend เรียกไม่สำเร็จ
          const direct = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          if (direct.ok) data = await direct.json();
        }

        const address = formatNominatimAddress(data) || data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
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

  // ค้นหาสถานที่ผ่าน Google Maps URL / พิกัด / Backend API / Photon
  const searchPlace = async (queryText, showDropdown = true) => {
    if (!queryText || !queryText.trim()) return;
    const cleanText = queryText.trim();
    setIsSearching(true);
    setSearchEmpty(false);

    try {
      // 0. ตรวจสอบทันทีก่อนว่าผู้ใช้วาง Google Maps URL หรือพิมพ์พิกัดละติจูด,ลองจิจูด มาหรือไม่
      const localParsed = parseGoogleMapsOrCoords(cleanText);
      if (localParsed) {
        setIsSearching(false);
        setSelectedLocation(localParsed);
        setSearchQuery(localParsed.name);
        setSearchResults([]);
        setSearchEmpty(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([localParsed.lat, localParsed.lng], 17);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([localParsed.lat, localParsed.lng]);
        }
        return;
      }

      // 0.1 ตรวจสอบกรณีเป็น short link (maps.app.goo.gl หรือ goo.gl/maps)
      if (cleanText.includes('maps.app.goo.gl') || cleanText.includes('goo.gl/maps')) {
        try {
          const res = await api.get('/locations/parse-url', {
            params: { url: cleanText }
          });
          if (res && res.lat && res.lng) {
            setIsSearching(false);
            setSelectedLocation(res);
            setSearchQuery(res.name);
            setSearchResults([]);
            setSearchEmpty(false);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([res.lat, res.lng], 17);
            }
            if (markerRef.current) {
              markerRef.current.setLatLng([res.lat, res.lng]);
            }
            return;
          }
        } catch (err) {
          console.warn('Failed to parse short link:', err);
        }
      }

      let results = [];

      // 1. ค้นหาผ่าน Backend Proxy (เสถียรที่สุดและไม่โดนบล็อก)
      try {
        const res = await api.get('/locations/search', {
          params: { q: cleanText }
        });
        if (Array.isArray(res) && res.length > 0) {
          results = res;
        }
      } catch (backendErr) {
        console.warn('Backend location search failed, falling back to Photon:', backendErr);
      }

      // 2. ถ้า Backend ไม่มีผลลัพธ์ ลองดึงจาก Photon Komoot API ตรงๆ (CORS friendly)
      if (results.length === 0) {
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanText)}&limit=6&bbox=97.3,5.6,105.7,20.5`
          );
          if (photonRes.ok) {
            const photonData = await photonRes.json();
            results = (photonData.features || []).map(f => {
              const props = f.properties || {};
              const coords = f.geometry?.coordinates || [0, 0];
              const parts = [props.name, props.street, props.district, props.city, props.state].filter(Boolean);
              return {
                lat: String(coords[1]),
                lon: String(coords[0]),
                display_name: parts.join(', ') || props.name || cleanText,
                name: props.name || '',
                address: {
                  road: props.street,
                  city: props.city,
                  state: props.state
                }
              };
            });
          }
        } catch (photonErr) {
          console.error('Photon fallback failed:', photonErr);
        }
      }

      if (results.length > 0) {
        if (showDropdown) {
          setSearchResults(results);
          setSearchEmpty(false);
        } else {
          // เลือกผลลัพธ์แรกและย้ายหมุดทันที
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
        setSearchEmpty(true);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (showDropdown) setSearchEmpty(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0]);
    } else {
      searchPlace(searchQuery, false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const name = formatNominatimAddress(result) || result.display_name;

    setSelectedLocation({ name, lat, lng: lon });
    setSearchResults([]);
    setSearchEmpty(false);
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
              <p className="text-[11px] text-slate-400 font-medium">พิมพ์ค้นหาหรือคลิกบนแผนที่เพื่อปักหมุด</p>
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
                placeholder="วางลิงก์ Google Maps / พิกัด (lat, lng) หรือค้นหาถนน, ตำบล..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50/60"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                </div>
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchEmpty(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>ค้นหา</span>
            </button>

            <button
              type="button"
              onClick={handlePasteFromClipboard}
              title="วางลิงก์ Google Maps หรือพิกัดที่คัดลอกมา"
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-200 shrink-0"
            >
              <Clipboard className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">วางพิกัด</span>
            </button>

            <button
              type="button"
              onClick={handleGetCurrentLocation}
              title="ดึงพิกัด GPS ตำแหน่งปัจจุบันของคุณ"
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-200 shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">ตำแหน่งของฉัน</span>
            </button>
          </form>

          {/* Quick Helper Tip below Search Bar */}
          <div className="mt-1.5 px-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">
              💡 <span className="font-semibold text-blue-700">เคล็ดลับ:</span> สำหรับบริษัท/ร้านค้า สามารถคัดลอกลิงก์หรือพิกัดจาก <span className="font-medium text-slate-700">Google Maps</span> แล้วกดปุ่ม "วางพิกัด" ได้ทันที
            </span>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto z-30 animate-fadeIn">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ผลการค้นหา ({searchResults.length})
              </div>
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

          {/* Empty search alert with smart instructions */}
          {searchEmpty && !isSearching && searchQuery.trim() && (
            <div className="absolute top-full left-3 right-3 mt-1.5 bg-white border border-amber-200 rounded-xl shadow-2xl p-3.5 z-30 animate-fadeIn text-left">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">
                    ไม่พบชื่อ "{searchQuery}" ในระบบแผนที่ฟรี
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    สถานที่นี้เป็นสาขาบริษัทเอกชน ซึ่งมีข้อมูลเฉพาะใน Google Maps
                  </p>

                  {/* ปุ่มบินไปจังหวัดอัตโนมัติเมื่อระบุชื่อจังหวัดในคำค้นหา */}
                  {detectedProvince && (
                    <button
                      type="button"
                      onClick={() => {
                        const coords = PROVINCE_COORDS[detectedProvince];
                        if (coords && mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo(coords, 14);
                          updateMarkerPosition(coords[0], coords[1], true);
                          setSearchEmpty(false);
                        }
                      }}
                      className="w-full mt-2.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>เลื่อนแผนที่ไปที่ <strong>{detectedProvince}</strong> เพื่อคลิกเลือกปักหมุด</span>
                    </button>
                  )}

                  {/* คำแนะนำและปุ่มเปิด Google Maps เพื่อคัดลอกลิงก์ */}
                  <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-slate-700">💡 วิธีปักหมุดตรงอาคารนี้ 100%:</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                        <span>1. เปิดค้นหาใน Google Maps</span>
                      </a>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Clipboard className="w-3.5 h-3.5 text-blue-600" />
                        <span>2. วางลิงก์หรือพิกัด</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Geocoding indicator overlay */}
          {isGeocoding && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-900/85 text-white text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-xs z-10 animate-fadeIn">
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
