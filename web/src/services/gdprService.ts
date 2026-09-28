import { supabase } from '../lib/supabase';
import { clearAnalyticsStorage, CONSENT_CHANGED, setAnalyticsConsentInMemory } from './analyticsPrivacy';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const gdprService = {
  // Check if user is in EU based on IP or geolocation
  isEUUser: async (): Promise<boolean> => {
    // List of EU country codes
    const euCountryCodes = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB' // GB included for UK GDPR
    ];

    // Primary method: IP-based geolocation using ipapi.co
    try {
      const response = await fetch('https://ipapi.co/json/', {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return euCountryCodes.includes(data.country_code);
    } catch (error) {
      console.error('IP API failed (ipapi.co):', error);
      // Fallback to browser geolocation
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        // Approximate EU bounds: latitude 35 to 70, longitude -25 to 45
        const { latitude, longitude } = position.coords;
        const isInEUBounds = latitude >= 35 && latitude <= 70 && longitude >= -25 && longitude <= 45;
        return isInEUBounds;
      } catch (geoError) {
        console.error('Geolocation fallback failed:', geoError);
        // Final fallback: Assume non-EU to avoid blocking app
        return false;
      }
    }
  },
  
  // Save consent preferences to localStorage
  saveConsent: async (preferences: CookiePreferences): Promise<void> => {
    try {
      localStorage.setItem('gdpr_preferences', JSON.stringify(preferences));
      localStorage.setItem('gdpr_consent_timestamp', new Date().toISOString());
      setAnalyticsConsentInMemory(preferences.analytics === true);
      window.dispatchEvent(new Event(CONSENT_CHANGED));
    } catch (error) {
      // A failed preference write must not retain an earlier opt-in.
      setAnalyticsConsentInMemory(false);
      try { localStorage.removeItem('gdpr_preferences'); } catch { /* In-memory denial still applies. */ }
      window.dispatchEvent(new Event(CONSENT_CHANGED));
      console.error('Error saving GDPR consent:', error);
      return;
    }
    // Server-side bookkeeping must not delay or reverse the local choice.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) void gdprService.saveConsentToDatabase(user.id, preferences);
    } catch { /* The local choice remains authoritative. */ }
  },
  
  // Save consent to database for authenticated users
  saveConsentToDatabase: async (userId: string, preferences: CookiePreferences): Promise<void> => {
    try {
      const { error } = await supabase
        .from('gdpr_consents')
        .upsert({
          user_id: userId,
          preferences: preferences,
          ip_address: 'client-side-capture-disabled',
          consent_date: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      if (error) {
        console.error('Error saving consent to database:', error);
        if (error.code === '42P01') {
          console.log('GDPR consents table does not exist, would create in production');
        }
      }
    } catch (error) {
      console.error('Error in saveConsentToDatabase:', error);
    }
  },
  
  hasConsent: (): boolean => {
    try {
      return localStorage.getItem('gdpr_preferences') !== null;
    } catch (error) {
      console.error('Error checking GDPR consent:', error);
      return false;
    }
  },
  
  getPreferences: (): CookiePreferences | null => {
    try {
      const preferences = localStorage.getItem('gdpr_preferences');
      const parsed = preferences ? JSON.parse(preferences) : null;
      return parsed && typeof parsed.analytics === 'boolean' ? parsed : null;
    } catch (error) {
      console.error('Error getting GDPR preferences:', error);
      return null;
    }
  },
  
  isAllowed: (cookieType: keyof CookiePreferences): boolean => {
    try {
      const preferences = gdprService.getPreferences();
      if (!preferences) {
        return cookieType === 'necessary';
      }
      return preferences[cookieType] === true;
    } catch (error) {
      console.error('Error checking if cookie type is allowed:', error);
      return cookieType === 'necessary';
    }
  },
  
  clearNonEssentialCookies: (): void => {
    clearAnalyticsStorage();
  },
  
  requestDataAction: async (actionType: 'access' | 'delete' | 'correct', userData: { details: string }): Promise<string> => {
    const { data, error } = await supabase.rpc('submit_data_request' as any, {
      p_type: actionType, p_details: userData.details.trim(),
    } as any);
    if (error) throw new Error(error.message);
    if (typeof data !== 'string') throw new Error('Your request was not saved. Please try again.');
    return data;
  }
};

export default gdprService;
