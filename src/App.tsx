import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from './components/Header';
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
import PasswordResetPage from './components/PasswordResetPage';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { useAuthContext } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { supabase } from './lib/supabase';
import { useMediaQuery } from 'react-responsive';
import LoadingSpinner from './components/LoadingSpinner';
import AnalyticsPage from './components/AnalyticsPage';

// Wrapper component for ApplicationsPage to handle React Router integration
function ApplicationsPageWrapper() {
  const { referralId } = useParams<{ referralId: string }>();
  const navigate = useNavigate();
  const [referralTitle, setReferralTitle] = useState('Job Referral');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchJobTitle = async () => {
      if (!referralId) return;
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('title')
          .eq('id', referralId as any)
          .single();
        
        if (error) throw error;
        if (data) {
          setReferralTitle((data as any).title);
        }
      } catch (error) {
        console.error('Error fetching job title:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobTitle();
  }, [referralId]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleMessage = (applicantId: number) => {
    // Navigate to messages page and pass applicantId as state, always include a unique timestamp
    navigate('/messages', { state: { selectedApplicant: applicantId, msgNavTs: Date.now() } });
  };
  
  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };
  
  if (!referralId) {
    return <Navigate to="/jobs" />;
  }
  
  if (loading) {
    return <LoadingSpinner text="Loading job details..." />;
  }
  
  return (
    <ApplicationsPage 
      referralId={referralId}
      referralTitle={referralTitle}
      onBack={handleBack} 
      onMessage={handleMessage}
      onViewProfile={handleViewProfile}
    />
  );
}

// Wrapper component for UserProfilePage to handle React Router integration
function UserProfilePageWrapper() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleViewProfile = (newUserId: string) => {
    navigate(`/user/${newUserId}`);
  };
  
  if (!userId) {
    return <Navigate to="/jobs" />;
  }
  
  return (
    <UserProfilePage 
      userId={userId} 
      onBack={handleBack} 
      onViewProfile={handleViewProfile} 
    />
  );
}

// Wrapper component for SearchResultsPage to handle React Router integration
function SearchResultsPageWrapper() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const searchQuery = searchParams.get('q') || '';
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };
  
  if (!searchQuery) {
    return <Navigate to="/jobs" />;
  }
  
  return (
    <SearchResultsPage 
      searchQuery={searchQuery}
      onBack={handleBack} 
      onViewProfile={handleViewProfile} 
    />
  );
}

// Wrapper component for SettingsPage
function SettingsPageWrapper() {
  return <SettingsPage currentSection="settings" />;
}

// Wrapper component for PrivacyPolicy
function PrivacyPolicyWrapper() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <PrivacyPolicy onBack={handleBack} />;
}

// Wrapper component for CookiePolicy
function CookiePolicyWrapper() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <CookiePolicy onBack={handleBack} />;
}

// Wrapper component for TermsOfService
function TermsOfServiceWrapper() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <TermsOfService onBack={handleBack} />;
}

// Wrapper component for DataRequestForm
function DataRequestFormWrapper() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <DataRequestForm onBack={handleBack} />;
}

// Wrapper component for Home page that handles password reset
function HomePageWrapper() {
  const [searchParams] = useSearchParams();
  const isResetFlow = searchParams.get('reset') === 'true';
  
  if (isResetFlow) {
    return <PasswordResetPage />;
  }
  
  return (
    <>
      <Hero /> <Services /> <About />
    </>
  );
}

// Add a wrapper for MessagesPage to read selectedApplicant from location state
function MessagesPageWrapper() {
  const location = useLocation();
  // Read selectedApplicant from navigation state (if present)
  const selectedApplicant = location.state?.selectedApplicant;
  return <MessagesPage selectedApplicant={selectedApplicant} />;
}

function App() {
  return (
    <LoadingProvider>
      <Router>
        <Routes>
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </LoadingProvider>
  );
}

function AppContent() {
  const { user, loading, isAdmin } = useAuthContext();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [searchParams] = useSearchParams();
  const isResetFlow = searchParams.get('reset') === 'true';
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isAdmin && (location.pathname === '/' || location.pathname === '')) {
      navigate('/analytics', { replace: true });
    }
  }, [user, isAdmin, loading, location.pathname, navigate]);

  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' | 'verify-email' | 'forgot-password' }>({
    isOpen: false,
    mode: 'signin',
  });

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuthModal = () => {
    setAuthModal({ isOpen: false, mode: 'signin' });
  };

  const handleAuthModeChange = (mode: 'signin' | 'signup' | 'verify-email' | 'forgot-password') => {
    setAuthModal(prev => ({ ...prev, mode }));
  };

  if (loading) {
    return <LoadingSpinner text="Initializing..." />;
  }

  // If this is a password reset flow, show the password reset page regardless of authentication status
  if (isResetFlow) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-100">
        <main className="flex-grow">
          <PasswordResetPage />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Header onSignIn={() => handleOpenAuthModal('signin')} onJoinNow={() => handleOpenAuthModal('signup')} />
      <main className="flex-grow">
        <Routes>
          {user ? (
            <>
              <Route path="/analytics" element={isAdmin ? <AnalyticsPage /> : <Navigate to="/jobs" replace />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/create-referral" element={<CreateReferralPage />} />
              <Route path="/applications/:referralId" element={<ApplicationsPageWrapper />} />
              <Route path="/search-results" element={<SearchResultsPageWrapper key={location.search} />} />
              <Route path="/messages" element={<MessagesPageWrapper />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/user/:userId" element={<UserProfilePageWrapper />} />
              <Route path="/settings" element={<SettingsPageWrapper />} />
              <Route path="*" element={<Navigate to="/jobs" />} />
            </>
          ) : (
            <>
              <Route
                path="/"
                element={<HomePageWrapper />}
              />
              <Route path="/privacy-policy" element={<PrivacyPolicyWrapper />} />
              <Route path="/cookie-policy" element={<CookiePolicyWrapper />} />
              <Route path="/terms" element={<TermsOfServiceWrapper />} />
              <Route path="/data-request" element={<DataRequestFormWrapper />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </main>
      {!(isMobile && location.pathname === '/messages') && <Footer />}
      <AuthModal isOpen={authModal.isOpen} onClose={handleCloseAuthModal} mode={authModal.mode} onModeChange={handleAuthModeChange} />
    </div>
  );
}

export default App;