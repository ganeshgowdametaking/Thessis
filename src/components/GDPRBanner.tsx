import React, { useState, useEffect } from 'react';
import { X, Info, Check, Settings } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface GDPRBannerProps {
  onAccept: (preferences: CookiePreferences) => void;
  onReject: () => void;
}

const GDPRBanner: React.FC<GDPRBannerProps> = ({ onAccept, onReject }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    functional: true,
    analytics: true,
    marketing: false
  });

  const handlePreferenceChange = (category: keyof CookiePreferences) => {
    if (category === 'necessary') return; // Can't change necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    onAccept(allAccepted);
  };

  const handleAcceptSelected = () => {
    onAccept(preferences);
  };

  const handleReject = () => {
    const minimalPreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    onAccept(minimalPreferences);
    onReject();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg border-t border-slate-200 transition-transform duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {!showDetails ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">We value your privacy</h3>
                <p className="text-sm text-slate-600 mt-1">
                  We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-2 sm:mt-0">
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-slate-700 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Customize
              </button>
              <button
                onClick={handleReject}
                className="text-sm text-slate-700 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Cookie Preferences</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="font-medium text-slate-900">Necessary Cookies</h4>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Required</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    These cookies are essential for the website to function properly.
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">Functional Cookies</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    These cookies enable personalized features and functionality.
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={() => handlePreferenceChange('functional')}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">Analytics Cookies</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    These cookies help us understand how visitors interact with our website.
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={() => handlePreferenceChange('analytics')}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">Marketing Cookies</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    These cookies are used to display relevant advertising and marketing content.
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={() => handlePreferenceChange('marketing')}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleReject}
                className="text-sm text-slate-700 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptSelected}
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GDPRBanner;