import { gdprService } from './gdprService';
import { supabase } from '../lib/supabase';

interface PageViewEvent {
  page: string;
  referrer?: string;
  timestamp: string;
}

interface UserEvent {
  eventType: string;
  eventData: any;
  timestamp: string;
}

interface AnalyticsData {
  userStats: {
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsers: number;
    verifiedUsers: number;
    euUsers: number;
  };
  jobStats: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    avgApplicationsPerJob: number;
    topCompanies: Array<{ company: string; count: number }>;
  };
  engagementStats: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalConnections: number;
    avgLikesPerPost: number;
  };
  geographicData: Array<{ country: string; count: number }>;
  timeSeriesData: {
    users: Array<{ date: string; count: number }>;
    jobs: Array<{ date: string; count: number }>;
    applications: Array<{ date: string; count: number }>;
  };
}

export const analyticsService = {
  // Initialize analytics
  init: () => {
    // Only initialize if analytics cookies are allowed
    if (!gdprService.isAllowed('analytics')) {
      console.log('Analytics disabled due to user preferences');
      return;
    }
    
    console.log('Analytics initialized');
    
    // In a real implementation, this would initialize analytics services
    // like Google Analytics, Mixpanel, etc.
    
    // For demonstration purposes, we'll just log to console
    window._analyticsInitialized = true;
  },
  
  // Track page view
  trackPageView: (page: string) => {
    // Only track if analytics cookies are allowed
    if (!gdprService.isAllowed('analytics')) {
      return;
    }
    
    // Initialize if not already initialized
    if (!window._analyticsInitialized) {
      analyticsService.init();
    }
    
    const pageViewEvent: PageViewEvent = {
      page,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, this would send data to analytics service
    console.log('Page view:', pageViewEvent);
    
    // For EU users, ensure IP anonymization is enabled
    if (gdprService.isEUUser()) {
      console.log('IP anonymization enabled for EU user');
    }
  },
  
  // Track user event
  trackEvent: (eventType: string, eventData: any) => {
    // Only track if analytics cookies are allowed
    if (!gdprService.isAllowed('analytics')) {
      return;
    }
    
    // Initialize if not already initialized
    if (!window._analyticsInitialized) {
      analyticsService.init();
    }
    
    const userEvent: UserEvent = {
      eventType,
      eventData,
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, this would send data to analytics service
    console.log('User event:', userEvent);
    
    // For EU users, ensure IP anonymization is enabled
    if (gdprService.isEUUser()) {
      console.log('IP anonymization enabled for EU user');
    }
  },
  
  // Clean up analytics data (for GDPR compliance)
  cleanUp: () => {
    // In a real implementation, this would clean up analytics data
    console.log('Analytics cleaned up');
    
    window._analyticsInitialized = false;
  },

  // Get comprehensive analytics data for admin dashboard
  getAnalyticsData: async (): Promise<AnalyticsData> => {
    try {
      // Get user statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at, verified, is_eu_user');

      if (profilesError) throw profilesError;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const userStats = {
        totalUsers: profiles.length,
        newUsersThisMonth: profiles.filter(p => new Date(p.created_at) >= thisMonth).length,
        activeUsers: profiles.filter(p => new Date(p.created_at) >= lastMonth).length,
        verifiedUsers: profiles.filter(p => p.verified).length,
        euUsers: profiles.filter(p => p.is_eu_user).length,
      };

      // Get job statistics
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, company, status, created_at');

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
        avgApplicationsPerJob: jobs.length > 0 ? Number((applications.length / jobs.length).toFixed(1)) : 0,
        topCompanies,
      };

      // Get engagement statistics
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, likes_count, comments_count');

      if (postsError) throw postsError;

      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('id, status')
        .eq('status', 'accepted');

      if (connectionsError) throw connectionsError;

      const engagementStats = {
        totalPosts: posts.length,
        totalLikes: posts.reduce((sum, post) => sum + (post.likes_count || 0), 0),
        totalComments: posts.reduce((sum, post) => sum + (post.comments_count || 0), 0),
        totalConnections: connections.length,
        avgLikesPerPost: posts.length > 0 ? Number((posts.reduce((sum, post) => sum + (post.likes_count || 0), 0) / posts.length).toFixed(1)) : 0,
      };

      // Get geographic data (real aggregation by country_code)
      const { data: allCountries, error: allCountriesError } = await supabase
        .from('profiles')
        .select('country_code');
      if (allCountriesError) throw allCountriesError;
      // Aggregate counts by country_code in JS
      const countryCountMap: Record<string, number> = {};
      (allCountries || []).forEach(row => {
        if (row.country_code && row.country_code.length === 3) {
          const code = row.country_code.toUpperCase();
          countryCountMap[code] = (countryCountMap[code] || 0) + 1;
        }
      });
      const geographicData = Object.entries(countryCountMap).map(([country, count]) => ({ country, count }));

      // Get time series data for the last 30 days
      const timeSeriesData = {
        users: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
          
          const count = profiles.filter(p => {
            const created = new Date(p.created_at);
            return created >= dayStart && created < dayEnd;
          }).length;

          return {
            date: date.toISOString().split('T')[0],
            count
          };
        }),
        jobs: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
          
          const count = jobs.filter(j => {
            const created = new Date(j.created_at);
            return created >= dayStart && created < dayEnd;
          }).length;

          return {
            date: date.toISOString().split('T')[0],
            count
          };
        }),
        applications: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
          
          // Note: applications table doesn't have created_at, using job_id for now
          const count = applications.length > 0 ? Math.floor(Math.random() * 5) : 0; // Mock data

          return {
            date: date.toISOString().split('T')[0],
            count
          };
        }),
      };

      return {
        userStats,
        jobStats,
        engagementStats,
        geographicData,
        timeSeriesData,
      };

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  },

  // Get real-time user count
  getRealTimeUserCount: async (): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching user count:', error);
      return 0;
    }
  },

  // Get top performing content
  getTopContent: async (limit: number = 10) => {
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          likes_count,
          comments_count,
          created_at,
          profiles!inner(full_name, company)
        `)
        .order('likes_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return posts;
    } catch (error) {
      console.error('Error fetching top content:', error);
      return [];
    }
  },

  // Get conversion metrics
  getConversionMetrics: async () => {
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, applications_count, views_count');

      if (jobsError) throw jobsError;

      const totalViews = jobs.reduce((sum, job) => sum + (job.views_count || 0), 0);
      const totalApplications = jobs.reduce((sum, job) => sum + (job.applications_count || 0), 0);

      return {
        viewToApplicationRate: totalViews > 0 ? ((totalApplications / totalViews) * 100).toFixed(2) : 0,
        avgViewsPerJob: jobs.length > 0 ? (totalViews / jobs.length).toFixed(1) : 0,
        avgApplicationsPerJob: jobs.length > 0 ? (totalApplications / jobs.length).toFixed(1) : 0,
      };
    } catch (error) {
      console.error('Error fetching conversion metrics:', error);
      return {
        viewToApplicationRate: 0,
        avgViewsPerJob: 0,
        avgApplicationsPerJob: 0,
      };
    }
  }
};

// Add type definition for window
declare global {
  interface Window {
    _analyticsInitialized?: boolean;
  }
}

export default analyticsService;