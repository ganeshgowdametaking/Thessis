import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { useEUDetection } from '../hooks/useEUDetection';

interface TrackingProviderProps {
  children: React.ReactNode;
}

const TrackingProvider: React.FC<TrackingProviderProps> = ({ children }) => {
  const location = useLocation();
  const { isEUUser, loading } = useEUDetection();

  // Track page views when location changes
  useEffect(() => {
    if (!loading && (!isEUUser || localStorage.getItem('gdpr_consent') === 'true')) {
      analyticsService.trackPageView(location.pathname);
    }
  }, [location.pathname, isEUUser, loading]);

  // Track first-time visitor events
  useEffect(() => {
    if (!loading && !isEUUser) {
      const isFirstVisit = !localStorage.getItem('has_visited_before');
      if (isFirstVisit) {
        analyticsService.trackEvent('first_visit', {
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }
    }
  }, [isEUUser, loading]);

  // GDPR-compliant visitor tracking for EU users
  useEffect(() => {
    if (!loading && isEUUser && localStorage.getItem('gdpr_consent') === 'true') {
      analyticsService.trackEUVisitor();
    }
  }, [isEUUser, loading]);

  // Track user engagement metrics
  const trackEngagement = useCallback((eventType: string, eventData: any) => {
    if (!loading && (!isEUUser || localStorage.getItem('gdpr_consent') === 'true')) {
      analyticsService.trackEvent(eventType, eventData);
    }
  }, [isEUUser, loading]);

  // Track user interactions
  const trackInteraction = useCallback((interaction: any) => {
    if (!loading && (!isEUUser || localStorage.getItem('gdpr_consent') === 'true')) {
      analyticsService.trackInteraction(interaction);
    }
  }, [isEUUser, loading]);

  // Expose tracking functions to children via context
  const trackingContext = {
    trackEvent: trackEngagement,
    trackInteraction,
    isTrackingEnabled: !loading && (!isEUUser || localStorage.getItem('gdpr_consent') === 'true')
  };

  return (
    <div className="tracking-provider">
      {children}
    </div>
  );
};

export default TrackingProvider; 