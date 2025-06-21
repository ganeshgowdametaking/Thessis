import React, { useState, useEffect } from 'react';
import { Mail, Check } from 'lucide-react';
import { gdprService } from '../services/gdprService';

const NewsletterSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isEUUser, setIsEUUser] = useState(false);

  useEffect(() => {
    const checkEUStatus = async () => {
      const isEU = await gdprService.isEUUser();
      setIsEUUser(isEU);
    };
    
    checkEUStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // For EU users, check consent
    if (isEUUser && !consent) {
      setError('Please consent to receive our newsletter');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log subscription with consent status for GDPR compliance
      console.log('Newsletter subscription:', {
        email,
        consent,
        timestamp: new Date().toISOString(),
        isEUUser
      });
      
      setSuccess(true);
      setEmail('');
      setConsent(false);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (error: any) {
      setError(error.message || 'Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Subscribe to Our Newsletter</h2>
          <p className="text-slate-300 mb-6">
            Get the latest updates, job opportunities, and professional insights delivered to your inbox.
          </p>
        </div>
        
        {success ? (
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-green-700">
              <Check className="h-5 w-5" />
              <span className="font-medium">Thank you for subscribing!</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            {/* GDPR Consent Checkbox - Only shown to EU users */}
            {isEUUser && (
              <div className="flex items-start space-x-3">
                <div className="flex items-center h-5">
                  <input
                    id="consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-500 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="consent" className="text-slate-300">
                    I consent to receive marketing communications from TankTide. I understand that I can unsubscribe at any time by clicking the unsubscribe link in the emails. For more information, please see our{' '}
                    <a href="/privacy-policy" className="text-blue-400 hover:text-blue-300">
                      Privacy Policy
                    </a>.
                  </label>
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={loading || (isEUUser && !consent)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewsletterSignup;