import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Globe, Users, TrendingUp, CheckCircle, ArrowRight, MapPin } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const CompanyLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [userLocation, setUserLocation] = useState({
    country: 'US',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectUserLocation();
  }, []);

  const detectUserLocation = async () => {
    try {
      // Try to get location from browser
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      setUserLocation({
        country: data.country_code || 'US',
        currency: getCurrencyForCountry(data.country_code),
        dateFormat: getDateFormatForCountry(data.country_code)
      });
    } catch (error) {
      console.log('Using default location (US)');
      setUserLocation({
        country: 'US',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyForCountry = (countryCode: string) => {
    const currencyMap: { [key: string]: string } = {
      'US': 'USD',
      'CA': 'CAD',
      'GB': 'GBP',
      'EU': 'EUR',
      'AU': 'AUD',
      'IN': 'INR'
    };
    return currencyMap[countryCode] || 'USD';
  };

  const getDateFormatForCountry = (countryCode: string) => {
    const dateFormatMap: { [key: string]: string } = {
      'US': 'MM/DD/YYYY',
      'CA': 'MM/DD/YYYY',
      'GB': 'DD/MM/YYYY',
      'EU': 'DD/MM/YYYY',
      'AU': 'DD/MM/YYYY',
      'IN': 'DD/MM/YYYY'
    };
    return dateFormatMap[countryCode] || 'MM/DD/YYYY';
  };

  const getLocalizedHeadline = () => {
    const headlines: { [key: string]: string } = {
      'US': 'Hire Top Talent with Referrals',
      'CA': 'Hire Top Talent with Referrals',
      'GB': 'Hire Top Talent with Referrals',
      'EU': 'Hire Top Talent with Referrals',
      'AU': 'Hire Top Talent with Referrals',
      'IN': 'Hire Top Talent with Referrals'
    };
    return headlines[userLocation.country] || 'Hire Top Talent with Referrals';
  };

  const getLocalizedSubheadline = () => {
    const subheadlines: { [key: string]: string } = {
      'US': `Post jobs for free and get 2× more qualified candidates through employee referrals.`,
      'CA': `Post jobs for free and get 2× more qualified candidates through employee referrals.`,
      'GB': `Post jobs for free and get 2× more qualified candidates through employee referrals.`,
      'EU': `Post jobs for free and get 2× more qualified candidates through employee referrals.`,
      'AU': `Post jobs for free and get 2× more qualified candidates through employee referrals.`,
      'IN': `Post jobs for free and get 2× more qualified candidates through employee referrals.`
    };
    return subheadlines[userLocation.country] || `Post jobs for free and get 2× more qualified candidates through employee referrals.`;
  };

  const handlePostJobClick = () => {
    if (user) {
      navigate('/company-dashboard');
    } else {
      navigate('/company-signup');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 relative z-10">
        <div className="flex items-center space-x-2">
          <img src="/new-logo.png?v=2" alt="Thessis Logo" className="h-12 w-12 object-contain" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white text-sm">
            <MapPin className="h-4 w-4" />
            <span>{userLocation.country}</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-white hover:text-blue-200 transition-colors"
          >
            For Job Seekers
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex items-center justify-center px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {getLocalizedHeadline()}
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            {getLocalizedSubheadline()}
          </p>

          {/* CTA Button */}
          <button
            onClick={handlePostJobClick}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2 mx-auto"
          >
            <span>Post Jobs for free</span>
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white bg-opacity-10 rounded-lg p-6 text-white">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Employee Referrals</h3>
            <p className="text-blue-100">Get 2× more qualified candidates through your employees' networks.</p>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-6 text-white">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
            <p className="text-blue-100">AI-powered candidate matching based on skills and company culture.</p>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-6 text-white">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mb-4">
              <Globe className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Global Reach</h3>
            <p className="text-blue-100">Access talent from around the world with localized job postings.</p>
          </div>
        </div>
      </div>


    </div>
  );
};

export default CompanyLandingPage; 