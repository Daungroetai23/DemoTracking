import { Router } from 'express';

const router = Router();
const USER_AGENT = 'DemoTracking/1.0 (https://demo-tracking-alpha.vercel.app; info@demotrack.com)';

// ค้นหาสถานที่ (Search Geocoding)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || !String(q).trim()) {
    return res.json([]);
  }

  const query = String(q).trim();

  try {
    // 1. ลองค้นหาผ่าน OpenStreetMap Nominatim พร้อม User-Agent ที่ถูกต้อง
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

    // 2. ถ้า Nominatim ไม่พบผลลัพธ์ ให้ Fallback ไปที่ Photon Komoot
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

export default router;
