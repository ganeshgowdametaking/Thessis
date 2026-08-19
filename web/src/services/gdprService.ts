import { supabase } from '../lib/supabase';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        gdprService.saveConsentToDatabase(user.id, preferences);
      }
    } catch (error) {
      console.error('Error saving GDPR consent:', error);
    }
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
      return preferences ? JSON.parse(preferences) : null;
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
    try {
      const cookies = document.cookie.split(';');
      const necessaryCookies = ['supabase-auth-token'];
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (necessaryCookies.includes(name)) {
          continue;
        }
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
      console.log('Non-essential cookies cleared');
    } catch (error) {
      console.error('Error clearing non-essential cookies:', error);
    }
  },
  
  requestDataAction: async (actionType: 'access' | 'delete' | 'correct', userData: any): Promise<boolean> => {
    try {
      console.log(`GDPR ${actionType} request:`, userData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      console.error(`Error requesting data ${actionType}:`, error);
      return false;
    }
  }
};

export default gdprService;