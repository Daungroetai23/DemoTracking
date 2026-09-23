import { Router } from 'express';

const router = Router();
const USER_AGENT = 'DemoTracking/1.0 (https://demo-tracking-alpha.vercel.app; info@demotrack.com)';

// ฟังก์ชันแกะพิกัดและชื่อสถานที่จาก URL Google Maps หรือข้อความพิกัด
export function parseGoogleMapsUrl(str) {
  if (!str || typeof str !== 'string') return null;
  const rawText = str.trim();

  // 1. ตรวจสอบว่ามี URL แฝงอยู่ในข้อความหรือไม่ (เช่น กรณีคัดลอกจากปุ่มแชร์ของ Google Maps บนมือถือ)
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
}

// ค้นหาสถานที่ (Search Geocoding)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || !String(q).trim()) {
    return res.json([]);
  }

  const query = String(q).trim();

  // ตรวจสอบว่าผู้ใช้วางลิงก์ Google Maps หรือพิมพ์พิกัดมาโดยตรงหรือไม่
  const directParsed = parseGoogleMapsUrl(query);
  if (directParsed) {
    return res.json([
      {
        lat: String(directParsed.lat),
        lon: String(directParsed.lng),
        display_name: directParsed.name,
        name: directParsed.name,
        isDirectGoogleMaps: true
      }
    ]);
  }

  try {
    // 1. ถ้ามีการตั้งค่า LONGDO_MAP_KEY ให้ค้นหาผ่าน Longdo Map API เป็นลำดับแรก (ฐานข้อมูลสถานที่ในไทยแน่นและแม่นยำมาก)
    const longdoKey = process.env.LONGDO_MAP_KEY;
    if (longdoKey) {
      try {
        const longdoUrl = `https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(query)}&limit=10&key=${longdoKey}`;
        const longdoRes = await fetch(longdoUrl, {
          headers: {
            'Referer': req.headers.referer || 'http://localhost:5173/',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        if (longdoRes.ok) {
          const longdoData = await longdoRes.json();
          if (Array.isArray(longdoData?.data) && longdoData.data.length > 0) {
            const mapped = longdoData.data.map(item => ({
              lat: String(item.lat),
              lon: String(item.lon),
              display_name: [item.name, item.address].filter(Boolean).join(', '),
              name: item.name || '',
              address: {
                road: item.address
              },
              source: 'longdo'
            }));
            return res.json(mapped);
          }
        }
      } catch (longdoErr) {
        console.warn('Longdo search error, fallback to OSM:', longdoErr);
      }
    }

    // 2. ลองค้นหาผ่าน OpenStreetMap Nominatim พร้อม User-Agent ที่ถูกต้อง
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=th&limit=6&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'th, en'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
    }

    // 3. ถ้า Nominatim ไม่พบผลลัพธ์ ให้ Fallback ไปที่ Photon Komoot
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&bbox=97.3,5.6,105.7,20.5`;
    const photonRes = await fetch(photonUrl);
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      const mapped = (photonData.features || []).map(f => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const parts = [props.name, props.street, props.district, props.city, props.state].filter(Boolean);
        return {
          lat: String(coords[1]),
          lon: String(coords[0]),
          display_name: parts.join(', ') || props.name || query,
          name: props.name || '',
          address: {
            road: props.street,
            city: props.city,
            state: props.state
          }
        };
      });
      return res.json(mapped);
    }

    return res.json([]);
  } catch (error) {
    console.error('Location search error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการค้นหาตำแหน่ง', error: error.message });
  }
});

// ดึงชื่อสถานที่จากพิกัด (Reverse Geocoding)
router.get('/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: 'พิกัด lat และ lng จำเป็นต้องระบุ' });
  }

  try {
    // 1. ถ้ามี LONGDO_MAP_KEY ให้ใช้ Longdo Reverse Geocoding ได้ชื่อภาษาไทยละเอียดมาก
    const longdoKey = process.env.LONGDO_MAP_KEY;
    if (longdoKey) {
      try {
        const longdoRevUrl = `https://api.longdo.com/map/services/address?lat=${lat}&lon=${lng}&key=${longdoKey}`;
        const longdoRevRes = await fetch(longdoRevUrl, {
          headers: {
            'Referer': req.headers.referer || 'http://localhost:5173/',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        if (longdoRevRes.ok) {
          const revData = await longdoRevRes.json();
          if (revData && (revData.road || revData.subdistrict || revData.district || revData.province)) {
            const parts = [
              revData.road,
              revData.subdistrict,
              revData.district,
              revData.province,
              revData.postcode
            ].filter(Boolean);
            return res.json({
              display_name: parts.join(' '),
              name: revData.road || revData.subdistrict || '',
              address: {
                road: revData.road,
                subdistrict: revData.subdistrict,
                district: revData.district,
                province: revData.province,
                postcode: revData.postcode
              },
              source: 'longdo'
            });
          }
        }
      } catch (revErr) {
        console.warn('Longdo reverse geocode error:', revErr);
      }
    }

    // 2. Fallback ใช้ OpenStreetMap Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'th, en'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }

    return res.json({ display_name: `${lat}, ${lng}` });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงชื่อสถานที่', error: error.message });
  }
});

// แกะพิกัดจาก Short Link ของ Google Maps (เช่น maps.app.goo.gl)
router.get('/parse-url', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ message: 'จำเป็นต้องระบุ URL' });
  }

  try {
    let finalUrl = String(url).trim();
    if (finalUrl.includes('goo.gl') || finalUrl.includes('maps.app.goo.gl')) {
      const resp = await fetch(finalUrl, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      finalUrl = resp.url || finalUrl;
    }

    const parsed = parseGoogleMapsUrl(finalUrl);
    if (parsed) {
      return res.json(parsed);
    }
    return res.status(404).json({ message: 'ไม่สามารถระบุพิกัดจากลิงก์นี้ได้' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอ่านลิงก์', error: err.message });
  }
});

export default router;
