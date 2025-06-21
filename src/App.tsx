import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/HomePage';
import JobsPage from './components/JobsPage';
import CreateReferralPage from './components/CreateReferralPage';
import ApplicationsPage from './components/ApplicationsPage';
import SearchResultsPage from './components/SearchResultsPage';
import MessagesPage from './components/MessagesPage';
import NotificationsPage from './components/NotificationsPage';
import ProfilePage from './components/ProfilePage';
import UserProfilePage from './components/UserProfilePage';
import SettingsPage from './components/SettingsPage';
import Hero from './components/Hero';
import Services from './components/Services';
import About from './components/About';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy';
import TermsOfService from './components/TermsOfService';
import DataRequestForm from './components/DataRequestForm';
import Footer from './components/Footer';
import GDPRBanner from './components/GDPRBanner';
import { useAuthContext } from './contexts/AuthContext';
import { gdprService } from './services/gdprService';

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const { user, loading, error } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentPage, setCurrentPage] = useState(() => {
    const path = location.pathname.substring(1) || 'home';
    const storedPage = sessionStorage.getItem('tanktide_current_page');
    const validPages = [
      'home', 'jobs', 'create-referral', 'applications', 'search-results',
      'messages', 'notifications', 'profile', 'user-profile', 'account-settings',
      'privacy-policy', 'notifications-settings', 'privacy-policy-page',
      'cookie-policy', 'terms', 'data-request'
    ];
    return validPages.includes(path) ? path : (validPages.includes(storedPage || '') ? storedPage! : 'home');
  });
  
  const [selectedReferral, setSelectedReferral] = useState<{id: number, title: string} | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('tanktide_search_query') || '';
  });
  const [isEUUser, setIsEUUser] = useState(false);
  const [showGDPRBanner, setShowGDPRBanner] = useState(false);
  const [refreshJobsTrigger, setRefreshJobsTrigger] = useState(0); // Added for refresh

  useEffect(() => {
    const checkEUStatus = async () => {
      try {
        const isEU = await gdprService.isEUUser();
        setIsEUUser(isEU);
        if (isEU && !gdprService.hasConsent()) {
          setShowGDPRBanner(true);
        }
      } catch (error) {
        console.error('Failed to check EU status:', error);
        setIsEUUser(false);
      }
    };
    
    checkEUStatus();
  }, []);

  useEffect(() => {
    if (currentPage && currentPage !== 'landing') {
      sessionStorage.setItem('tanktide_current_page', currentPage);
      const currentPath = location.pathname.substring(1) || 'home';
      if (currentPage !== currentPath) {
        const newPath = currentPage === 'home' ? '/' : `/${currentPage}`;
        navigate(newPath, { replace: true, state: { internal: true } });
      }
    }
  }, [currentPage, location.pathname, navigate]);

  useEffect(() => {
    if (searchQuery) {
      sessionStorage.setItem('tanktide_search_query', searchQuery);
    } else {
      sessionStorage.removeItem('tanktide_search_query');
    }
  }, [searchQuery]);

  useEffect(() => {
    const path = location.pathname.substring(1) || 'home';
    if (path !== currentPage) {
      setCurrentPage(path);
      if (location.state) {
        const state = location.state as any;
        if (state.selectedApplicant) setSelectedApplicant(state.selectedApplicant);
        if (state.selectedReferral) setSelectedReferral(state.selectedReferral);
        if (state.selectedUserId) setSelectedUserId(state.selectedUserId);
        if (state.searchQuery) setSearchQuery(state.searchQuery);
      }
    }
  }, [location.pathname, currentPage]);

  useEffect(() => {
    const handleRefreshJobs = () => {
      setRefreshJobsTrigger(prev => prev + 1);
    };
    window.addEventListener('refresh-jobs', handleRefreshJobs);
    return () => {
      window.removeEventListener('refresh-jobs', handleRefreshJobs);
    };
  }, []);

  const handleViewApplications = (referralId: number, referralTitle: string) => {
    setSelectedReferral({ id: referralId, title: referralTitle });
    setCurrentPage('applications');
    navigate('/applications', { 
      state: { selectedReferral: { id: referralId, title: referralTitle }, internal: true } 
    });
  };

  const handleMessageApplicant = (applicantId: number) => {
    setSelectedApplicant(applicantId);
    setCurrentPage('messages');
    navigate('/messages', { 
      state: { selectedApplicant: applicantId, internal: true } 
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage('search-results');
    navigate('/search-results', { 
      state: { searchQuery: query, internal: true } 
    });
  };

  const handleBackFromSearch = () => {
    setSearchQuery('');
    sessionStorage.removeItem('tanktide_search_query');
    setCurrentPage('home');
    navigate('/', { replace: true, state: { internal: true } });
  };

  const handleViewProfile = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage('user-profile');
    navigate('/user-profile', { 
      state: { selectedUserId: userId, internal: true } 
    });
  };

  const handleGDPRAccept = (preferences: any) => {
    gdprService.saveConsent(preferences);
    setShowGDPRBanner(false);
  };

  const handleGDPRReject = () => {
    gdprService.clearNonEssentialCookies();
    setShowGDPRBanner(false);
  };

  const handleCreateReferral = (callback: () => void) => {
    setCurrentPage('create-referral');
    navigate('/create-referral', { state: { internal: true } });
    callback(); // Trigger refresh in JobsPage
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 mb-2">Loading TankTide...</p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
                <p className="text-red-800 text-sm font-medium">Connection Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (error && !loading) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Retry Connection
              </button>
              <button 
                onClick={() => {
                  setCurrentPage('landing');
                  window.location.hash = '';
                }} 
                className="w-full bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Continue Offline
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!user || !user.email_confirmed_at) {
      return (
        <>
          <Hero />
          <Services />
          <About />
        </>
      );
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onViewProfile={handleViewProfile} />;
      case 'jobs':
        return <JobsPage onCreateReferral={handleCreateReferral} />;
      case 'create-referral':
        return (
          <CreateReferralPage 
            onBack={() => {
              setCurrentPage('jobs');
              navigate('/jobs', { state: { internal: true } });
            }}
            onViewApplications={handleViewApplications}
          />
        );
      case 'applications':
        return selectedReferral ? (
          <ApplicationsPage
            onBack={() => {
              setCurrentPage('create-referral');
              navigate('/create-referral', { state: { internal: true } });
            }}
            onMessage={handleMessageApplicant}
            referralId={selectedReferral.id}
            referralTitle={selectedReferral.title}
          />
        ) : (
          <Navigate to="/jobs" replace />
        );
      case 'search-results':
        return <SearchResultsPage searchQuery={searchQuery} onBack={handleBackFromSearch} onViewProfile={handleViewProfile} />;
      case 'messages':
        return <MessagesPage selectedApplicant={selectedApplicant} onViewProfile={handleViewProfile} />;
      case 'notifications':
        return <NotificationsPage onViewProfile={handleViewProfile} />;
      case 'profile':
        return <ProfilePage />;
      case 'user-profile':
        return selectedUserId ? (
          <UserProfilePage 
            userId={selectedUserId} 
            onBack={() => {
              setCurrentPage('home');
              navigate('/', { state: { internal: true } });
            }}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <Navigate to="/" replace />
        );
      case 'account-settings':
      case 'privacy-policy':
      case 'notifications-settings':
        return <SettingsPage currentSection={currentPage} />;
      case 'privacy-policy-page':
        return <PrivacyPolicy onBack={() => {
          setCurrentPage('home');
          navigate('/', { state: { internal: true } });
        }} />;
      case 'cookie-policy':
        return <CookiePolicy onBack={() => {
          setCurrentPage('home');
          navigate('/', { state: { internal: true } });
        }} />;
      case 'terms':
        return <TermsOfService onBack={() => {
          setCurrentPage('home');
          navigate('/', { state: { internal: true } });
        }} />;
      case 'data-request':
        return <DataRequestForm onBack={() => {
          setCurrentPage('home');
          navigate('/', { state: { internal: true } });
        }} />;
      default:
        return <HomePage onViewProfile={handleViewProfile} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        currentPage={currentPage} 
        onPageChange={(page) => {
          setCurrentPage(page);
          const path = page === 'home' ? '/' : `/${page}`;
          navigate(path, { state: { internal: true } });
        }} 
        onSearch={handleSearch} 
      />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={renderPage()} />
          <Route path="/:page" element={renderPage()} />
        </Routes>
      </main>
      <Footer />
      
      {showGDPRBanner && isEUUser && (
        <GDPRBanner 
          onAccept={handleGDPRAccept}
          onReject={handleGDPRReject}
        />
      )}
    </div>
  );
}

export default App;