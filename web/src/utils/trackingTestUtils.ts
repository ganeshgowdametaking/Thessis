// Tracking Test Utilities
// These functions can be called from the browser console for testing
// Only available on the analytics page for admin users

declare global {
  interface Window {
    trackingTest: {
      testNonEUTracking: () => void;
      testEUTracking: () => void;
      testEUSignup: () => void;
      getStatus: () => void;
      getEUStats: () => void;
      getSessionData: () => void;
      clearData: () => void;
      setEUUser: (isEU: boolean) => void;
      setConsent: (hasConsent: boolean) => void;
      help: () => void;
    };
  }
}

// Import analytics service
import { analyticsService } from '../services/analyticsService';

// Check if we're on the analytics page and user is admin
const isAnalyticsPage = () => {
  return window.location.pathname === '/analytics';
};

const isAdminUser = () => {
  // This is a simple check - in a real app you'd get this from your auth context
  const userRole = localStorage.getItem('user_role') || 'user';
  return userRole === 'admin';
};

// Test Non-EU tracking (full analytics)
const testNonEUTracking = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  console.log('🧪 Testing Non-EU Tracking...');
  
  // Clear EU flags
  localStorage.removeItem('is_eu_user');
  localStorage.removeItem('gdpr_consent');
  
  // Force analytics initialization
  analyticsService.init();
  
  // Track some test events
  analyticsService.trackPageView('/test-page');
  analyticsService.trackEvent('test_event', { test: 'data', timestamp: new Date().toISOString() });
  
  console.log('✅ Non-EU tracking test completed!');
  console.log('📊 Check localStorage for session data');
  console.log('📋 Session data:', localStorage.getItem('current_session'));
};

// Test EU tracking (GDPR-compliant)
const testEUTracking = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  console.log('🧪 Testing EU Tracking...');
  
  // Set EU flags
  localStorage.setItem('is_eu_user', 'true');
  localStorage.setItem('gdpr_consent', 'true');
  
  // Track EU visitor
  analyticsService.trackEUVisitor();
  
  console.log('✅ EU tracking test completed!');
  console.log('📊 Check EU visitor stats');
  console.log('📋 EU Stats:', analyticsService.getEUVisitorStats());
};

// Test EU signup tracking
const testEUSignup = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  console.log('🧪 Testing EU Signup Tracking...');
  
  analyticsService.trackEUSignup();
  
  console.log('✅ EU signup tracking test completed!');
  console.log('📊 Updated EU Stats:', analyticsService.getEUVisitorStats());
};

// Get current tracking status
const getStatus = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  const status = {
    isEUUser: localStorage.getItem('is_eu_user') === 'true',
    gdprConsent: localStorage.getItem('gdpr_consent') === 'true',
    analyticsInitialized: window._analyticsInitialized || false,
    sessionId: window._sessionId || 'Not set',
    isFirstVisit: window._firstVisit || false,
    totalVisitors: localStorage.getItem('total_visitors') || '0',
    firstTimeVisitors: localStorage.getItem('first_time_visitors') || '0',
    totalSignups: localStorage.getItem('total_signups') || '0',
    hasVisitedBefore: localStorage.getItem('has_visited_before') || 'false'
  };
  
  console.log('📊 Current Tracking Status:');
  console.table(status);
  
  return status;
};

// Get EU visitor statistics
const getEUStats = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  const stats = analyticsService.getEUVisitorStats();
  console.log('📊 EU Visitor Statistics:');
  console.table(stats);
  return stats;
};

// Get session data
const getSessionData = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  const sessionData = localStorage.getItem('current_session');
  if (sessionData) {
    const parsed = JSON.parse(sessionData);
    console.log('📋 Session Data:');
    console.log(parsed);
    return parsed;
  } else {
    console.log('❌ No session data found');
    return null;
  }
};

// Clear all tracking data
const clearData = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  localStorage.clear();
  console.log('🗑️ All tracking data cleared!');
  console.log('🔄 Refresh the page to restart tracking');
};

// Set EU user status
const setEUUser = (isEU: boolean) => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  if (isEU) {
    localStorage.setItem('is_eu_user', 'true');
    console.log('🇪🇺 Set as EU user');
  } else {
    localStorage.removeItem('is_eu_user');
    console.log('🌍 Set as non-EU user');
  }
};

// Set GDPR consent
const setConsent = (hasConsent: boolean) => {
  if (!isAnalyticsPage()) {
    console.log('❌ This function is only available on the analytics page');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ This function is only available for admin users');
    return;
  }

  if (hasConsent) {
    localStorage.setItem('gdpr_consent', 'true');
    console.log('✅ GDPR consent given');
  } else {
    localStorage.removeItem('gdpr_consent');
    console.log('❌ GDPR consent removed');
  }
};

// Show help
const help = () => {
  if (!isAnalyticsPage()) {
    console.log('❌ Tracking test utilities are only available on the analytics page');
    console.log('📍 Navigate to /analytics to access these functions');
    return;
  }
  
  if (!isAdminUser()) {
    console.log('❌ Tracking test utilities are only available for admin users');
    return;
  }

  console.log(`
🧪 Tracking Test Utilities Help:

Available functions:
• trackingTest.testNonEUTracking() - Test full analytics for non-EU users
• trackingTest.testEUTracking() - Test GDPR-compliant tracking for EU users
• trackingTest.testEUSignup() - Test EU signup tracking
• trackingTest.getStatus() - Get current tracking status
• trackingTest.getEUStats() - Get EU visitor statistics
• trackingTest.getSessionData() - Get current session data
• trackingTest.clearData() - Clear all tracking data
• trackingTest.setEUUser(true/false) - Set EU user status
• trackingTest.setConsent(true/false) - Set GDPR consent
• trackingTest.help() - Show this help

Quick test scenarios:
1. Non-EU tracking: trackingTest.testNonEUTracking()
2. EU tracking: trackingTest.testEUTracking()
3. EU signup: trackingTest.testEUSignup()
4. Check status: trackingTest.getStatus()

Remember to check the browser console for detailed logs!
  `);
};

// Expose functions globally only on analytics page
const initializeTrackingTest = () => {
  if (isAnalyticsPage() && isAdminUser()) {
    window.trackingTest = {
      testNonEUTracking,
      testEUTracking,
      testEUSignup,
      getStatus,
      getEUStats,
      getSessionData,
      clearData,
      setEUUser,
      setConsent,
      help
    };

    // Auto-show help on first load
    if (!localStorage.getItem('tracking_test_help_shown')) {
      setTimeout(() => {
        console.log('🧪 Tracking test utilities loaded! Type trackingTest.help() for available functions.');
        localStorage.setItem('tracking_test_help_shown', 'true');
      }, 1000);
    }
  }
};

// Initialize when the script loads
initializeTrackingTest();

// Also initialize when the page changes (for SPA navigation)
let currentPath = window.location.pathname;
const observer = new MutationObserver(() => {
  if (window.location.pathname !== currentPath) {
    currentPath = window.location.pathname;
    setTimeout(initializeTrackingTest, 100); // Small delay to ensure page has loaded
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

export {
  testNonEUTracking,
  testEUTracking,
  testEUSignup,
  getStatus,
  getEUStats,
  getSessionData,
  clearData,
  setEUUser,
  setConsent,
  help,
  initializeTrackingTest
}; 