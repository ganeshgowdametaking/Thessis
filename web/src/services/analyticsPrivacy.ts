// Shared by consent, attribution, and tracking. Never depend on Supabase to read consent.
export const CONSENT_CHANGED = 'thessis:cookie-choice-changed';
export const ANALYTICS_PREFIX = 'thessis_analytics_';
let sessionChoice: boolean | null = null;
export function setAnalyticsConsentInMemory(choice: boolean | null) { sessionChoice = choice; }
export const analyticsConsent = (): boolean => {
  if (sessionChoice === false) return false;
  try {
    return JSON.parse(localStorage.getItem('gdpr_preferences') || 'null')?.analytics === true;
  } catch { return false; }
};

const legacyKeys = new Set(['current_session', 'all_sessions', 'has_visited_before',
  'first_visit_date', 'total_visitors', 'first_time_visitors', 'total_signups',
  'last_signup_date', 'platform_attribution_data', 'gdpr_consent']);

export function clearAnalyticsStorage(): void {
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[kind];
      for (const key of Object.keys(storage)) {
        if (key.startsWith(ANALYTICS_PREFIX) || key.startsWith('ph_') ||
          key.startsWith('__ph_opt_in_out_') || legacyKeys.has(key)) storage.removeItem(key);
      }
    } catch { /* Tracking must not require available storage. */ }
  }
  try {
    for (const item of document.cookie.split(';')) {
      const name = item.split('=')[0].trim();
      if (!/^(ph_|__ph_opt_in_out_|_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name)) continue;
      const domains = location.hostname.split('.');
      document.cookie = `${name}=; Max-Age=0; path=/`;
      while (domains.length > 1) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domains.join('.')}`;
        domains.shift();
      }
    }
  } catch { /* Preserve auth and necessary preferences. */ }
}

export function normalizedRoute(pathname: string): string {
  const routes = ['/', '/login', '/signup', '/jobs', '/create-referral', '/messages',
    '/notifications', '/profile', '/onboarding', '/settings', '/search-results',
    '/privacy-policy', '/cookie-policy', '/terms', '/data-request', '/reset-password',
    '/auth/callback', '/accept-admin-invite', '/analytics'];
  if (routes.includes(pathname)) return pathname;
  if (/^\/user\/[^/]+\/?$/.test(pathname)) return '/user/:id';
  if (/^\/applications\/[^/]+\/?$/.test(pathname)) return '/applications/:id';
  return '/other';
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Runtime allowlists also protect against future callers bypassing TypeScript.
export const eventNames = [
  '$pageview', 'section_viewed', 'cta_clicked', 'auth_started', 'auth_step_completed',
  'auth_completed', 'auth_failed', 'onboarding_step_completed', 'onboarding_completed',
  'profile_update_completed', 'job_search_performed', 'job_filters_applied', 'job_detail_viewed',
  'application_started', 'resume_upload_completed', 'application_submitted', 'referral_started',
  'referral_step_completed', 'referral_publish_completed', 'applicant_review_opened',
  'application_status_changed', 'ranking_requested', 'ranking_completed', 'notification_action_clicked',
  'conversation_opened', 'message_send_completed', 'connection_request_completed',
  'connection_response_completed', 'action_failed', 'feature_action',
] as const;
export type AnalyticsEvent = typeof eventNames[number];
const enums = {
  flow: ['signup', 'login', 'recovery', 'oauth', 'application', 'referral'],
  method: ['email', 'google', 'linkedin'],
  step: ['submitted', 'verified', 'password_updated', 'basics', 'role', 'skills', 'profile', 'education', 'experience'],
  feature: ['auth', 'jobs', 'applications', 'referrals', 'ranking', 'messages', 'connections', 'profile', 'notifications', 'search', 'settings', 'onboarding'],
  action: ['open', 'submit', 'upload', 'send', 'accept', 'decline', 'delete', 'save', 'unsave', 'next_page', 'filter', 'edit', 'rank', 'shortlist', 'unshortlist', 'message_referrer', 'view_applicants', 'view_profile'],
  status: ['pending', 'applied', 'shortlisted', 'referred', 'rejected', 'accepted', 'declined'],
  outcome: ['created', 'reused', 'joined', 'membership_failed', 'complete', 'partial', 'skipped'],
  error_category: ['validation', 'upload_failed', 'network_error', 'rate_limited', 'unauthorized', 'operation_failed'],
  section: ['hero', 'how-it-works', 'features', 'get-started'],
  cta: ['login', 'signup'],
  placement: ['header', 'hero', 'footer', 'final', 'sticky', 'navigation'],
  result_bucket: ['0', '1-5', '6-20', '21+'],
} as const;
export type AnalyticsProperties = Partial<{[K in keyof typeof enums]: (typeof enums)[K][number]}> & {flow_id?: string};

export function safeProperties(input: AnalyticsProperties): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(enums)) {
    const value = input[key as keyof AnalyticsProperties];
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) result[key] = value;
  }
  if (typeof input.flow_id === 'string' && UUID.test(input.flow_id)) result.flow_id = input.flow_id;
  return result;
}
