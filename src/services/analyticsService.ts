import { gdprService } from './gdprService';

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
  }
};

// Add type definition for window
declare global {
  interface Window {
    _analyticsInitialized?: boolean;
  }
}

export default analyticsService;