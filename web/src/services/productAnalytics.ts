import { ANALYTICS_PREFIX, analyticsConsent, clearAnalyticsStorage, CONSENT_CHANGED,
  setAnalyticsConsentInMemory, eventNames, normalizedRoute, safeProperties, UUID, type AnalyticsEvent, type AnalyticsProperties } from './analyticsPrivacy';
import { captureUTMParams, getAnalyticsAttribution } from '../utils/utmHandler';

const env = import.meta.env;
const key = (env.VITE_PUBLIC_POSTHOG_KEY || '').trim();
const hosts: Record<string, string> = {
  'https://us.i.posthog.com': 'https://us.i.posthog.com',
  'https://eu.i.posthog.com': 'https://eu.i.posthog.com',
  'https://us.posthog.com': 'https://us.i.posthog.com',
  'https://eu.posthog.com': 'https://eu.i.posthog.com',
};
const host = hosts[(env.VITE_PUBLIC_POSTHOG_HOST || '').replace(/\/$/, '')];
const isProduction = env.PROD && ['www.thessis.com', 'thessis.com'].includes(location.hostname);
const isQA = env.VITE_ANALYTICS_QA === 'true' && ['localhost', '127.0.0.1'].includes(location.hostname);
const configured = env.VITE_ANALYTICS_ENABLED === 'true' && (isProduction || isQA) && Boolean(host) && /^phc_[a-zA-Z0-9_]+$/.test(key);
const ID = `${ANALYTICS_PREFIX}identity_v1`;
const SESSION = `${ANALYTICS_PREFIX}session_v1`;
const AUTH = `${ANALYTICS_PREFIX}auth_attempt_v1`;
const HALF_HOUR = 30 * 60 * 1000;
let userId: string | null = null;
let started = false;
let lastPage = '';
let active = false;
const requests = new Set<AbortController>();
const seen = new Set<string>();

function allowed() { return configured && analyticsConsent(); }
function read(store: Storage, name: string) {
  try { return JSON.parse(store.getItem(name) || 'null'); } catch { return null; }
}
function identity(): {anonymous: string; user: string | null} {
  const saved = read(localStorage, ID);
  if (saved && UUID.test(saved.anonymous) && (saved.user === null || UUID.test(saved.user))) return saved;
  const fresh = {anonymous: crypto.randomUUID(), user: null};
  localStorage.setItem(ID, JSON.stringify(fresh));
  return fresh;
}
function session() {
  const saved = read(sessionStorage, SESSION);
  const id = saved && UUID.test(saved.id) && Date.now() - saved.at < HALF_HOUR ? saved.id : crypto.randomUUID();
  sessionStorage.setItem(SESSION, JSON.stringify({id, at: Date.now()}));
  return id;
}

// Use the documented ingestion API for this event-only release. No SDK auto-collection,
// remote config, replay loader, retry queue, unload beacon, or raw URL enrichment.
// Aborting on withdrawal cancels in-flight fetches; there is deliberately no offline queue.
function send(event: string, properties: Record<string, unknown>, distinctId: string) {
  if (!allowed()) return;
  const controller = new AbortController();
  requests.add(controller);
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  void fetch(`${host}/i/v0/e/?ip=0`, {
    method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
    headers: {'Content-Type': 'application/json'}, signal: controller.signal,
    body: JSON.stringify({api_key: key, event, uuid: crypto.randomUUID(), timestamp: new Date().toISOString(),
      properties: {...properties, distinct_id: distinctId, $ip: null, $geoip_disable: true,
        $process_person_profile: Boolean(userId), schema_version: 1,
        environment: isQA ? 'qa' : 'production', $lib: 'thessis-web', $lib_version: '1.0.0'}}),
  }).catch(() => { /* Analytics never changes a business outcome. */ }).finally(() => {
    clearTimeout(timeout); requests.delete(controller);
  });
}

function syncIdentity() {
  const saved = identity();
  // Reset the browser identity when another account uses this browser. Never merge two accounts.
  if (saved.user && saved.user !== userId) {
    saved.anonymous = crypto.randomUUID(); saved.user = null;
    sessionStorage.removeItem(SESSION); seen.clear();
  }
  if (userId && saved.user !== userId) {
    send('$identify', {$anon_distinct_id: saved.anonymous}, userId);
    saved.user = userId;
  }
  localStorage.setItem(ID, JSON.stringify(saved));
  return userId || saved.anonymous;
}

function withdraw() {
  active = false; lastPage = ''; seen.clear();
  for (const request of requests) request.abort();
  requests.clear();
  clearAnalyticsStorage();
}
function syncConsent() {
  if (!allowed()) { withdraw(); return; }
  try {
    captureUTMParams();
    if (!active) { active = true; syncIdentity(); productAnalytics.page(location.pathname); }
  } catch { withdraw(); }
}

export const productAnalytics = {
  start() {
    if (started) return;
    started = true;
    window.addEventListener(CONSENT_CHANGED, syncConsent);
    window.addEventListener('storage', event => {
      if (event.key === 'gdpr_preferences' || event.key === null) { setAnalyticsConsentInMemory(null); syncConsent(); }
    });
    syncConsent();
  },
  isEnabled: allowed,
  newFlow(): string | undefined {
    try { return allowed() ? crypto.randomUUID() : undefined; } catch { return undefined; }
  },
  identify(id: string | null) {
    try {
      userId = id && UUID.test(id) ? id : null;
      if (allowed()) syncIdentity();
    } catch { /* No dependency on analytics storage for authentication. */ }
  },
  capture(event: AnalyticsEvent, properties: AnalyticsProperties = {}, deduplicationKey?: string) {
    try {
      if (!allowed() || !eventNames.includes(event)) return;
      const dedupe = deduplicationKey && `${event}:${deduplicationKey}`;
      if (dedupe && seen.has(dedupe)) return;
      const distinctId = syncIdentity();
      const route = normalizedRoute(location.pathname);
      send(event, {...safeProperties(properties), ...getAnalyticsAttribution(), route,
        $current_url: `https://www.thessis.com${route}`, $pathname: route,
        $session_id: session(), $device_type: matchMedia('(max-width: 767px)').matches ? 'Mobile' : 'Desktop'}, distinctId);
      if (dedupe) { if (seen.size >= 1000) seen.clear(); seen.add(dedupe); }
    } catch { /* Fail closed on storage/serialization errors. */ }
  },
  page(path: string) {
    // Raw paths stay in memory solely to distinguish two profiles. Never transmit them.
    if (!allowed() || path === lastPage) return;
    lastPage = path;
    productAnalytics.capture('$pageview');
  },
  beginAuth(flow: 'login' | 'signup' | 'oauth' | 'recovery', method: 'email' | 'google' | 'linkedin') {
    try {
      if (!allowed()) return;
      const attempt = {flow, method, flow_id: crypto.randomUUID(), at: Date.now()};
      sessionStorage.setItem(AUTH, JSON.stringify(attempt));
      productAnalytics.capture('auth_started', attempt);
    } catch { /* Optional analytics. */ }
  },
  authStep(step: 'submitted' | 'verified' | 'password_updated') {
    const attempt = productAnalytics.authAttempt();
    if (attempt) productAnalytics.capture('auth_step_completed', {...attempt, step}, `${attempt.flow_id}:${step}`);
  },
  authAttempt(): AnalyticsProperties | null {
    try {
      if (!allowed()) return null;
      const attempt = read(sessionStorage, AUTH);
      if (!attempt || !UUID.test(attempt.flow_id) || Date.now() - attempt.at > (attempt.flow === 'signup' ? 7 * 24 * 60 * 60 * 1000 : HALF_HOUR)) return null;
      return safeProperties(attempt) as AnalyticsProperties;
    } catch { return null; }
  },
  completeAuth(id: string) {
    try {
      productAnalytics.identify(id);
      const attempt = productAnalytics.authAttempt();
      if (!attempt || attempt.flow === 'recovery') return;
      productAnalytics.capture('auth_completed', attempt, attempt.flow_id);
      sessionStorage.removeItem(AUTH);
    } catch { /* Optional analytics. */ }
  },
  failAuth() {
    try {
      const attempt = productAnalytics.authAttempt();
      if (attempt) productAnalytics.capture('auth_failed', {...attempt, error_category: 'operation_failed'});
      sessionStorage.removeItem(AUTH);
    } catch { /* Optional analytics. */ }
  },
};
