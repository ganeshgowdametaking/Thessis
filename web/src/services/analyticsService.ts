import { gdprService } from './gdprService';
import { supabase } from '../lib/supabase';
import { countryCodeToName } from '../utils/countryMapping';

interface PageViewEvent {
  page: string;
  referrer?: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  isFirstVisit?: boolean;
  userAgent?: string;
  screenResolution?: string;
  timeOnPage?: number;
}

interface UserEvent {
  eventType: string;
  eventData: any;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  page?: string;
  elementId?: string;
  elementType?: string;
  elementText?: string;
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'hover' | 'form_focus' | 'form_submit' | 'button_click' | 'link_click';
  elementId?: string;
  elementType?: string;
  elementText?: string;
  page: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  coordinates?: { x: number; y: number };
  scrollDepth?: number;
}

interface SessionData {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  pageViews: string[];
  interactions: UserInteraction[];
  userId?: string;
  isFirstVisit: boolean;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
}

interface AnalyticsData {
  userStats: {
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsers: number;
    verifiedUsers: number;
    euUsers: number;
    verifiedSecondaryEmailUsers: number;
  };
  jobStats: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    newJobsThisMonth: number;
    avgApplicationsPerJob: number;
  };
  engagementStats: {
    averageSessionDuration: number;
    averagePageViewsPerSession: number;
    mostVisitedPages: Array<{ page: string; views: number }>;
    topInteractions: Array<{ interaction: string; count: number }>;
  };
  conversionStats: {
    signupRate: number;
    jobApplicationRate: number;
    referralCreationRate: number;
  };
  geographicData: Array<{ country: string; count: number }>;
  topCompanies: Array<{ company: string; jobCount: number }>;
  verifiedUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    secondary_email: string;
    secondary_email_verified_at: string;
  }>;
  platformStats: {
    totalConnections: number;
    totalPosts: number;
    totalMessages: number;
    avgJobViews: number;
  };
  timeSeriesData: {
    users: Array<{ date: string; count: number }>;
    jobs: Array<{ date: string; count: number }>;
  };
}

declare global {
  interface Window {
    _analyticsInitialized: boolean;
    _sessionId: string;
    _firstVisit: boolean;
    _sessionStartTime: number;
    _lastActivity: number;
    _pageViews: string[];
    _interactions: UserInteraction[];
  }
}

// Generate unique session ID
const generateSessionId = (): string => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Check if this is the first visit
const isFirstVisit = (): boolean => {
  const hasVisited = localStorage.getItem('has_visited_before');
  if (!hasVisited) {
    localStorage.setItem('has_visited_before', 'true');
    localStorage.setItem('first_visit_date', new Date().toISOString());
    return true;
  }
  return false;
};

// Initialize session tracking
const initializeSession = (): void => {
  if (!window._sessionId) {
    window._sessionId = generateSessionId();
    window._firstVisit = isFirstVisit();
    window._sessionStartTime = Date.now();
    window._lastActivity = Date.now();
    window._pageViews = [];
    window._interactions = [];

    // Store session data
    const sessionData: SessionData = {
      sessionId: window._sessionId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      pageViews: [],
      interactions: [],
      isFirstVisit: window._firstVisit,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    localStorage.setItem('current_session', JSON.stringify(sessionData));
  }
};

// Track user interactions
const trackInteraction = async (interaction: Omit<UserInteraction, 'timestamp' | 'sessionId' | 'userId'>): Promise<void> => {
  if (!window._analyticsInitialized) return;

  const { data: { user } } = await supabase.auth.getUser();
  const interactionData: UserInteraction = {
    ...interaction,
    timestamp: new Date().toISOString(),
    sessionId: window._sessionId,
    userId: user?.id
  };

  window._interactions.push(interactionData);
  window._lastActivity = Date.now();

  // Store in localStorage for persistence
  const sessionData = JSON.parse(localStorage.getItem('current_session') || '{}');
  sessionData.interactions = window._interactions;
  sessionData.lastActivity = new Date().toISOString();
  localStorage.setItem('current_session', JSON.stringify(sessionData));

  // Send to analytics service (in real implementation)
  console.log('User interaction tracked:', interactionData);
};

// Set up event listeners for automatic tracking
const setupAutomaticTracking = (): void => {
  if (!window._analyticsInitialized) return;

  // Track clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const elementId = target.id || target.className || target.tagName;
    const elementType = target.tagName.toLowerCase();
    const elementText = target.textContent?.trim().substring(0, 100) || '';

    trackInteraction({
      type: 'click',
      elementId,
      elementType,
      elementText,
      page: window.location.pathname,
      coordinates: { x: e.clientX, y: e.clientY }
    });
  });

  // Track scroll depth
  let maxScrollDepth = 0;
  document.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollDepth = Math.round((scrollTop / scrollHeight) * 100);

    if (scrollDepth > maxScrollDepth) {
      maxScrollDepth = scrollDepth;
      trackInteraction({
        type: 'scroll',
        page: window.location.pathname,
        scrollDepth
      });
    }
  });

  // Track form interactions
  document.addEventListener('focus', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      const inputElement = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      trackInteraction({
        type: 'form_focus',
        elementId: inputElement.id || inputElement.name || '',
        elementType: target.tagName.toLowerCase(),
        page: window.location.pathname
      });
    }
  });

  // Track form submissions
  document.addEventListener('submit', (e) => {
    const target = e.target as HTMLFormElement;
    trackInteraction({
      type: 'form_submit',
      elementId: target.id || target.className,
      elementType: 'form',
      page: window.location.pathname
    });
  });

  // Track link clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link) {
      trackInteraction({
        type: 'link_click',
        elementId: link.id || link.className,
        elementType: 'a',
        elementText: link.textContent?.trim().substring(0, 100) || '',
        page: window.location.pathname
      });
    }
  });

  // Track button clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (button) {
      trackInteraction({
        type: 'button_click',
        elementId: button.id || button.className,
        elementType: 'button',
        elementText: button.textContent?.trim().substring(0, 100) || '',
        page: window.location.pathname
      });
    }
  });
};

export const analyticsService = {
  // Initialize analytics
  init: () => {
    // Check if user is EU and has not given consent
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      console.log('Analytics disabled for EU user without consent');
      return;
    }

    console.log('Analytics initialized');

    // Initialize session tracking
    initializeSession();

    // Set up automatic tracking for non-EU users or EU users with consent
    if (!isEU || consent === 'true') {
      setupAutomaticTracking();
    }

    window._analyticsInitialized = true;
  },

  // Track page view
  trackPageView: async (page: string) => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    // THROTTLE: Don't track if we just tracked this page < 1s ago
    // This prevents infinite loops if a component mounts/unmounts rapidly
    const now = Date.now();
    if (window._lastActivity && (now - window._lastActivity < 1000)) {
      console.log('⚠️ Analytics: Throttled rapid page view tracking');
      return;
    }

    // Initialize if not already initialized
    if (!window._analyticsInitialized) {
      analyticsService.init();
    }

    const { data: { user } } = await supabase.auth.getUser();
    const pageViewEvent: PageViewEvent = {
      page,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      sessionId: window._sessionId,
      userId: user?.id,
      isFirstVisit: window._firstVisit,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`
    };

    // Track page view
    window._pageViews.push(page);
    window._lastActivity = Date.now(); // Update activity time

    // Store in localStorage
    const sessionData = JSON.parse(localStorage.getItem('current_session') || '{}');
    sessionData.pageViews = window._pageViews;
    sessionData.lastActivity = new Date().toISOString();
    localStorage.setItem('current_session', JSON.stringify(sessionData));

    // Send to analytics service (in real implementation)
    console.log('Page view tracked:', pageViewEvent);

    // Track time on previous page
    if (window._pageViews.length > 1) {
      const timeOnPage = Date.now() - (window as any)._prevActivity || window._lastActivity;
      console.log('Time on page:', timeOnPage);
    }
    (window as any)._prevActivity = Date.now(); // Store for next time check
  },

  // Track user event
  trackEvent: async (eventType: string, eventData: any) => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    // Initialize if not already initialized
    if (!window._analyticsInitialized) {
      analyticsService.init();
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userEvent: UserEvent = {
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      sessionId: window._sessionId,
      userId: user?.id,
      page: window.location.pathname
    };

    // Send to analytics service (in real implementation)
    console.log('User event tracked:', userEvent);
  },

  // Track custom interaction
  trackInteraction: async (interaction: Omit<UserInteraction, 'timestamp' | 'sessionId' | 'userId'>) => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    await trackInteraction(interaction);
  },

  // Get session data
  getSessionData: (): SessionData | null => {
    try {
      const sessionData = localStorage.getItem('current_session');
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  },

  // Clean up analytics data (for GDPR compliance)
  cleanUp: () => {
    console.log('Analytics cleaned up');

    // Clear session data
    localStorage.removeItem('current_session');
    localStorage.removeItem('has_visited_before');
    localStorage.removeItem('first_visit_date');

    window._analyticsInitialized = false;
    window._sessionId = '';
    window._firstVisit = false;
    window._sessionStartTime = 0;
    window._lastActivity = 0;
    window._pageViews = [];
    window._interactions = [];
  },

  // Update existing users with missing country codes
  updateMissingCountryCodes: async () => {
    try {
      // Get all profiles without country_code
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .is('country_code', null);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        console.log(`Found ${profiles.length} profiles without country codes`);

        // Update all profiles to have 'IND' as default country
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ country_code: 'IND' })
          .is('country_code', null);

        if (updateError) throw updateError;

        return {
          updated: profiles.length,
          total: profiles.length,
          message: `Successfully updated ${profiles.length} profiles with country code 'IND'`
        };
      }

      return { updated: 0, total: 0, message: 'All profiles already have country codes' };
    } catch (error) {
      console.error('Error updating country codes:', error);
      throw error;
    }
  },

  // Get comprehensive analytics data for admin dashboard
  getAnalyticsData: async (): Promise<AnalyticsData> => {
    try {
      // Get user statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at, verified, is_eu_user, country_code');

      if (profilesError) throw profilesError;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Get profiles with secondary email verification
      const { data: verifiedProfiles, error: verifiedError } = await supabase
        .from('profiles')
        .select('id, full_name, email, secondary_email, secondary_email_verified_at')
        .eq('secondary_email_verified', true);

      if (verifiedError) throw verifiedError;

      const userStats = {
        totalUsers: profiles.length,
        newUsersThisMonth: profiles.filter(p => new Date(p.created_at) >= thisMonth).length,
        activeUsers: profiles.filter(p => new Date(p.created_at) >= lastMonth).length,
        verifiedUsers: profiles.filter(p => p.verified).length,
        euUsers: profiles.filter(p => p.is_eu_user).length,
        verifiedSecondaryEmailUsers: verifiedProfiles.length,
      };

      // Aggregate users by country_code
      const countryCounts: { [key: string]: number } = {};
      profiles.forEach((p: any) => {
        if (p.country_code) {
          countryCounts[p.country_code] = (countryCounts[p.country_code] || 0) + 1;
        }
      });

      const geographicData = Object.entries(countryCounts).map(([code, count]) => {
        const countryName = countryCodeToName[code] || code;
        return {
          country: countryName,
          count
        };
      });

      // Get job statistics
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, company, status, created_at, views_count');

      if (jobsError) throw jobsError;

      const { data: applications, error: applicationsError } = await supabase
        .from('applications')
        .select('id, job_id');

      if (applicationsError) throw applicationsError;

      // Count companies
      const companyCounts = jobs.reduce((acc: any, job) => {
        acc[job.company] = (acc[job.company] || 0) + 1;
        return acc;
      }, {});

      const topCompanies = Object.entries(companyCounts)
        .map(([company, count]) => ({ company, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const jobStats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'active').length,
        totalApplications: applications.length,
        newJobsThisMonth: jobs.filter(j => new Date(j.created_at) >= thisMonth).length,
        avgApplicationsPerJob: jobs.length > 0 ? applications.length / jobs.length : 0
      };

      // Get session data for engagement stats
      const sessionData = analyticsService.getSessionData();
      const allSessions = JSON.parse(localStorage.getItem('all_sessions') || '[]');

      const engagementStats = {
        averageSessionDuration: allSessions.length > 0
          ? allSessions.reduce((acc: number, session: any) => {
            const duration = new Date(session.lastActivity).getTime() - new Date(session.startTime).getTime();
            return acc + duration;
          }, 0) / allSessions.length / 1000 // Convert to seconds
          : 0,
        averagePageViewsPerSession: allSessions.length > 0
          ? allSessions.reduce((acc: number, session: any) => acc + session.pageViews.length, 0) / allSessions.length
          : 0,
        mostVisitedPages: [], // Would be calculated from all sessions
        topInteractions: [] // Would be calculated from all sessions
      };

      // Calculate conversion rates
      const totalVisitors = allSessions.length;
      const signups = profiles.length;
      const jobApplications = applications.length;
      const referrals = jobs.filter(j => j.status === 'active').length;

      const conversionStats = {
        signupRate: totalVisitors > 0 ? (signups / totalVisitors) * 100 : 0,
        jobApplicationRate: totalVisitors > 0 ? (jobApplications / totalVisitors) * 100 : 0,
        referralCreationRate: totalVisitors > 0 ? (referrals / totalVisitors) * 100 : 0
      };

      // Get platform statistics
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('id');

      if (connectionsError) throw connectionsError;

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id');

      if (postsError) throw postsError;

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id');

      if (messagesError) throw messagesError;

      const platformStats = {
        totalConnections: connections.length,
        totalPosts: posts.length,
        totalMessages: messages.length,
        avgJobViews: jobs.length > 0 ? jobs.reduce((acc, job) => acc + (job.views_count || 0), 0) / jobs.length : 0
      };

      // Generate time series data for last 30 days (cumulative, UTC day boundaries)
      function getUTCDateString(date: Date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().split('T')[0];
      }
      const today = new Date();
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        d.setUTCDate(d.getUTCDate() - (29 - i));
        return d;
      });
      // Always show last 30 days, flat at 0 before first user/job
      const firstUserDate = profiles.length > 0 ? new Date(Math.min(...profiles.map(p => new Date(p.created_at).getTime()))) : null;
      const firstJobDate = jobs.length > 0 ? new Date(Math.min(...jobs.map(j => new Date(j.created_at).getTime()))) : null;
      const timeSeriesData = {
        users: days.map(day => {
          const endOfDay = new Date(day);
          endOfDay.setUTCHours(23, 59, 59, 999);
          let count = 0;
          if (!firstUserDate || endOfDay < firstUserDate) {
            count = 0;
          } else {
            count = profiles.filter(p => new Date(p.created_at) <= endOfDay).length;
          }
          return { date: getUTCDateString(day), count };
        }),
        jobs: days.map(day => {
          const endOfDay = new Date(day);
          endOfDay.setUTCHours(23, 59, 59, 999);
          let count = 0;
          if (!firstJobDate || endOfDay < firstJobDate) {
            count = 0;
          } else {
            count = jobs.filter(j => new Date(j.created_at) <= endOfDay).length;
          }
          return { date: getUTCDateString(day), count };
        })
      };

      // DEBUG: Log all user created_at dates and time series days
      console.log('User created_at dates:', profiles.map(p => p.created_at));
      console.log('Time series days:', days.map(d => d.toISOString()));
      console.log('User time series data:', timeSeriesData.users);

      return {
        userStats,
        jobStats,
        engagementStats,
        conversionStats,
        geographicData,
        topCompanies: topCompanies.map(c => ({ company: c.company, jobCount: c.count })),
        verifiedUsers: verifiedProfiles.map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          secondary_email: p.secondary_email,
          secondary_email_verified_at: p.secondary_email_verified_at
        })),
        platformStats,
        timeSeriesData
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  },

  // Save session data when user leaves
  saveSessionData: () => {
    if (!window._analyticsInitialized) return;

    const sessionData = analyticsService.getSessionData();
    if (sessionData) {
      const allSessions = JSON.parse(localStorage.getItem('all_sessions') || '[]');
      allSessions.push(sessionData);
      localStorage.setItem('all_sessions', JSON.stringify(allSessions));
    }
  },

  // GDPR-compliant visitor tracking for EU users
  trackEUVisitor: () => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (!isEU || consent !== 'true') return;

    // Track total visitors (aggregate only)
    const totalVisitors = parseInt(localStorage.getItem('total_visitors') || '0') + 1;
    localStorage.setItem('total_visitors', totalVisitors.toString());

    // Track first-time visitors
    const isFirstVisit = !localStorage.getItem('has_visited_before');
    if (isFirstVisit) {
      const firstTimeVisitors = parseInt(localStorage.getItem('first_time_visitors') || '0') + 1;
      localStorage.setItem('first_time_visitors', firstTimeVisitors.toString());
      localStorage.setItem('has_visited_before', 'true');
      localStorage.setItem('first_visit_date', new Date().toISOString());
    }

    console.log('EU Visitor tracked (GDPR-compliant):', {
      totalVisitors,
      firstTimeVisitors: parseInt(localStorage.getItem('first_time_visitors') || '0'),
      totalSignups: parseInt(localStorage.getItem('total_signups') || '0'),
      isFirstVisit
    });
  },

  // Get EU visitor statistics (GDPR-compliant)
  getEUVisitorStats: () => {
    const totalVisitors = parseInt(localStorage.getItem('total_visitors') || '0');
    const firstTimeVisitors = parseInt(localStorage.getItem('first_time_visitors') || '0');
    const totalSignups = parseInt(localStorage.getItem('total_signups') || '0');
    const signupRate = totalVisitors > 0 ? (totalSignups / totalVisitors) * 100 : 0;

    return {
      totalVisitors,
      firstTimeVisitors,
      totalSignups,
      signupRate: signupRate.toFixed(1),
      lastSignupDate: localStorage.getItem('last_signup_date')
    };
  },

  // Track EU user signup (GDPR-compliant)
  trackEUSignup: () => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (!isEU || consent !== 'true') return;

    const totalSignups = parseInt(localStorage.getItem('total_signups') || '0') + 1;
    localStorage.setItem('total_signups', totalSignups.toString());
    localStorage.setItem('last_signup_date', new Date().toISOString());

    console.log('EU Signup tracked (GDPR-compliant):', {
      totalSignups,
      totalVisitors: parseInt(localStorage.getItem('total_visitors') || '0'),
      signupRate: ((totalSignups / parseInt(localStorage.getItem('total_visitors') || '1')) * 100).toFixed(1) + '%'
    });
  }
};

// Save session data when user leaves the page
window.addEventListener('beforeunload', () => {
  analyticsService.saveSessionData();
});

// Save session data periodically
setInterval(() => {
  analyticsService.saveSessionData();
}, 30000); // Every 30 seconds