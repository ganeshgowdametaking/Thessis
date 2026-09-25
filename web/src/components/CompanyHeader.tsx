import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const CompanyHeader: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/companies');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/company-dashboard" className="flex items-center">
              <img src="/brand/thessis-logo-primary.svg" alt="Thessis" className="h-7 w-auto" />
              <span className="ml-2 text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">Company Portal</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/company-dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/company-dashboard')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                }`}
            >
              Dashboard
            </Link>

            <div className="relative group">
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors">
                Hiring
                <svg className="ml-1 inline-block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/company-hiring/jobs"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  All Jobs
                </Link>
                <Link
                  to="/company-hiring/new"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Post New Job
                </Link>
                <Link
                  to="/company-hiring/applicants"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Applicants
                </Link>
              </div>
            </div>

            <div className="relative group">
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors">
                Referrals
                <svg className="ml-1 inline-block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/company-referrals/incoming"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Incoming Referrals
                </Link>
                <Link
                  to="/company-referrals/outgoing"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Outgoing Invites
                </Link>
                <Link
                  to="/company-referrals/partners"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  My Partners
                </Link>
              </div>
            </div>

            <div className="relative group">
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors">
                Company
                <svg className="ml-1 inline-block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/company-profile/branding"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Profile & Branding
                </Link>
                <Link
                  to="/company-profile/careers"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Careers Page
                </Link>
                <Link
                  to="/company-profile/team"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Team & Access
                </Link>
              </div>
            </div>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                  <div className="px-4 py-2 text-sm text-slate-700 border-b">
                    <div className="font-medium">{user?.email}</div>
                    <div className="text-slate-500">Company Account</div>
                  </div>
                  <Link
                    to="/company-settings/account"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Settings
                  </Link>
                  <Link
                    to="/"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Main Website
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CompanyHeader; 