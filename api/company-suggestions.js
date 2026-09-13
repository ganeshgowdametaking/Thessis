// Proxies logo.dev's Brand Search API (https://api.logo.dev/search) for the
// Experience section's Company field — real typeahead over logo.dev's
// company database instead of a bare free-text input. This needs logo.dev's
// *secret* key (server-only), unlike the publishable key already used
// client-side for logo images in web/src/utils/companyLogo.ts — never
// expose the secret key to the browser directly, which is why this proxy
// exists at all (same reasoning as location-suggestions.js proxying
// Nominatim, just for a key-secrecy reason here instead of a CORS one).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  try {
    const q = String(req.query?.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(200).json([]);
    }

    const secretKey = process.env.LOGO_DEV_SECRET_KEY;
    if (!secretKey) {
      // No suggestions available until configured — the frontend falls back
      // to plain free-text entry, same as before this feature existed.
      return res.status(200).json([]);
    }

    const url = new URL('https://api.logo.dev/search');
    url.searchParams.set('q', q);

    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!upstream.ok) {
      return res.status(200).json([]);
    }

    const payload = await upstream.json();
    const list = Array.isArray(payload) ? payload : [];

    const mapped = list
      .slice(0, 10)
      .map((item) => ({
        name: item.name || item.canonical_name || '',
        domain: item.domain || null,
        logo_url: item.logo_url || (item.domain ? `https://img.logo.dev/${item.domain}` : null),
      }))
      .filter((item) => Boolean(item.name));

    return res.status(200).json(mapped);
  } catch (_err) {
    return res.status(200).json([]);
  }
}
