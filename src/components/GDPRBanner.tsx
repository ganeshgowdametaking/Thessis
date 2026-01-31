import React, { useState, useEffect } from 'react';
import { useEUDetection } from '../hooks/useEUDetection';

const GDPRBanner: React.FC = () => {
  const { isEUUser, loading } = useEUDetection();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading && isEUUser && !localStorage.getItem('gdpr_consent')) {
      setVisible(true);
    }
  }, [isEUUser, loading]);

  const handleAccept = () => {
    localStorage.setItem('gdpr_consent', 'true');
    setVisible(false);
    // Optionally, enable cookies/scripts here
  };

  if (loading) return null;
  if (!isEUUser) return null;
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-olive text-white p-4 z-50 flex flex-col md:flex-row items-center justify-between shadow-lg">
      <span className="mb-2 md:mb-0">
        We use cookies and similar technologies to enhance your experience. By clicking “Accept”, you consent to the use of cookies as described in our <a href="/privacy-policy" className="underline hover:text-primary transition-colors">Privacy Policy</a>.
      </span>
      <button
        onClick={handleAccept}
        className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-bold ml-0 md:ml-4 mt-2 md:mt-0 shadow-soft transition-all active:scale-[0.98]"
      >
        Accept
      </button>
    </div>
  );
};

export default GDPRBanner;