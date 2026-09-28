import { analyticsConsent, ANALYTICS_PREFIX } from '../services/analyticsPrivacy';
const STORAGE_KEY = `${ANALYTICS_PREFIX}attribution_v1`;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const sources = ['google', 'linkedin', 'instagram', 'facebook', 'whatsapp', 'email', 'direct', 'other'];
const mediums = ['organic', 'social', 'paid_social', 'cpc', 'email', 'referral'];
const campaigns = (import.meta.env.VITE_ANALYTICS_CAMPAIGNS || '').split(',').map((s: string) => s.trim())
  .filter((s: string) => /^[a-z0-9_-]{1,64}$/.test(s));
export interface UTMData {
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  utm_content: string | null; utm_term: null; captured_at: string;
}
const pick = (value: string | null, values: readonly string[]) => value && values.includes(value) ? value : null;
export function parseUTMParams(search: string): Partial<UTMData> | null {
  const params = new URLSearchParams(search);
  const result = {utm_source: pick(params.get('utm_source'), sources),
    utm_medium: pick(params.get('utm_medium'), mediums),
    utm_campaign: pick(params.get('utm_campaign'), campaigns),
    utm_content: pick(params.get('utm_content'), ['hero', 'header', 'footer', 'mobile', 'desktop']), utm_term: null};
  return Object.values(result).some(Boolean) ? result : null;
}
function readAttribution(): {first: UTMData; latest: UTMData} | null {
  try {
    if (!analyticsConsent()) return null;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data?.first || !data?.latest) return null;
    const clean = (entry: UTMData) => {
      const at = Date.parse(entry.captured_at);
      if (!Number.isFinite(at) || Date.now() - at > MAX_AGE || at > Date.now()) throw new Error('expired');
      return {...parseUTMParams(new URLSearchParams({
        utm_source: entry.utm_source || '', utm_medium: entry.utm_medium || '',
        utm_campaign: entry.utm_campaign || '', utm_content: entry.utm_content || '',
      }).toString()), captured_at: new Date(at).toISOString()} as UTMData;
    };
    return {first: clean(data.first), latest: clean(data.latest)};
  } catch { return null; }
}
export function captureUTMParams(): void {
  try {
    if (!analyticsConsent()) return;
    localStorage.removeItem('platform_attribution_data');
    const saved = readAttribution();
    let parsed = parseUTMParams(location.search);
    if (!parsed && saved) return;
    if (!parsed) {
      let source = 'direct';
      if (document.referrer) {
        const hostname = new URL(document.referrer).hostname;
        source = ['google', 'linkedin', 'instagram', 'facebook'].find(name =>
          hostname === `${name}.com` || hostname.endsWith(`.${name}.com`)) || 'other';
      }
      parsed = {utm_source: source};
    }
    const entry = {utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null,
      utm_term: null, ...parsed, captured_at: new Date().toISOString()} as UTMData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({first: saved?.first || entry, latest: entry}));
  } catch { /* Optional attribution must not interrupt navigation. */ }
}
export function getStoredUTMData(): UTMData | null { return readAttribution()?.latest || null; }
export function getAnalyticsAttribution(): Record<string, string> {
  const data = readAttribution();
  const properties: Record<string, string> = {};
  if (data) for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const) {
    if (data.latest[key]) properties[key] = data.latest[key]!;
    if (data.first[key]) properties[`initial_${key}`] = data.first[key]!;
  }
  return properties;
}
export function getUTMForSignup(): Record<string, string | null> {
  const data = getStoredUTMData();
  return data ? {utm_source: data.utm_source, utm_medium: data.utm_medium, utm_campaign: data.utm_campaign,
    utm_content: data.utm_content, utm_term: null} : {};
}
// Retain consented attribution for funnel reporting after signup.
export function clearUTMData(): void { try { localStorage.removeItem('platform_attribution_data'); } catch { /* optional */ } }
export function hasStoredUTMData(): boolean { return getStoredUTMData() !== null; }
