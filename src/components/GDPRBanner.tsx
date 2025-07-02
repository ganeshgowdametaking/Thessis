import React, { useState, useEffect } from 'react';
import { X, Info, Check, Settings } from 'lucide-react';
import { useEUDetection } from '../hooks/useEUDetection';

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
  const { isEUUser, loading } = useEUDetection();
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    functional: true,
    analytics: true,
    marketing: false
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading && isEUUser && !localStorage.getItem('gdpr_consent')) {
      setVisible(true);
    }
  }, [isEUUser, loading]);

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

  const handleAccept = () => {
    localStorage.setItem('gdpr_consent', 'true');
    setVisible(false);
    // Optionally, enable cookies/scripts here
  };

  if (loading) return null;
  if (!isEUUser) return null; // For non-EU users, show nothing (or a simple notice if you want)
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 z-50 flex flex-col md:flex-row items-center justify-between shadow-lg">
      <span className="mb-2 md:mb-0">
        We use cookies and similar technologies to enhance your experience. By clicking “Accept”, you consent to the use of cookies as described in our <a href="/privacy" className="underline">Privacy Policy</a>.
      </span>
      <button
        onClick={handleAccept}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold ml-0 md:ml-4 mt-2 md:mt-0"
      >
        Accept
      </button>
    </div>
  );
};

export default GDPRBanner;