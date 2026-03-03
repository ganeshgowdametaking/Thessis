const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const formatLocationLabel = (item) => {
  const address = item?.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    '';
  const state = address.state || address.region || '';
  const country = address.country || '';
  const compact = [city, state, country].filter(Boolean).join(', ');
  if (compact) return compact;

  const fallback = String(item?.display_name || '').split(',').slice(0, 3).join(',').trim();
  return fallback || String(item?.name || '').trim();
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const q = String(req.query?.q || '').trim();
    const rawLimit = Number(req.query?.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 10)) : 8;

    if (!q) {
      return res.status(200).json([]);
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', q);
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', String(limit));

    const upstream = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'TankTide/1.0 (support@tanktide.com)',
        'Accept-Language': 'en',
      },
    });

    if (!upstream.ok) {
      return res.status(200).json([]);
    }

    const payload = await upstream.json();
    const list = Array.isArray(payload) ? payload : [];

    const mapped = list
      .map((item) => {
        const label = formatLocationLabel(item);
        if (!label) return null;
        return {
          place_id: item.place_id || `${item.lat}-${item.lon}-${label}`,
          display_name: label,
          label,
          lat: item.lat || null,
          lon: item.lon || null,
          raw_display_name: item.display_name || null,
        };
      })
      .filter(Boolean);

    const deduped = mapped.filter(
      (item, index, arr) => arr.findIndex((candidate) => candidate.display_name === item.display_name) === index
    );

    return res.status(200).json(deduped);
  } catch (_err) {
    return res.status(200).json([]);
  }
}
