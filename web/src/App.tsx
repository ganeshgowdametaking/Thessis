// TankTide v2.0 - Enhanced UI/UX and Smart Messaging System
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
import GDPRBanner from './components/GDPRBanner';
import AuthCallback from './components/AuthCallback';
import TrackingProvider from './components/TrackingProvider';
import CompanyLandingPage from './components/CompanyLandingPage';
import AcceptAdminInvitePage from './components/AcceptAdminInvitePage';
import CompanySignupPage from './components/CompanySignupPage';
import CompanyLoginPage from './components/CompanyLoginPage';
import CompanyDashboardPage from './components/CompanyDashboardPage';
import CompanyConfirmationPage from './components/CompanyConfirmationPage';
import CompanyOnboardingPage from './components/CompanyOnboardingPage';
import CompanyJobSuccessPage from './components/CompanyJobSuccessPage';
import CompanyJobsPage from './components/CompanyJobsPage';
import CompanyNewJobPage from './components/CompanyNewJobPage';
import CompanyApplicantsPage from './components/CompanyApplicantsPage';
import CompanyIncomingReferralsPage from './components/CompanyIncomingReferralsPage';
import CompanyProfileBrandingPage from './components/CompanyProfileBrandingPage';
import CompanyLayout from './components/CompanyLayout';

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

  const handleMessage = (applicantId: string) => {
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
  console.log('🔥 SETTINGSPAGWRAPPER CALLED', new Date().toISOString());
  return <SettingsPage />;
}

// Wrapper component for PrivacyPolicy
function PrivacyPolicyWrapper() {
  const navigate = useNavigate();
  return <PrivacyPolicy onBack={() => navigate(-1)} />;
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
  const location = useLocation();
  const isResetFlow = searchParams.get('reset') === 'true' || location.hash.includes('type=recovery');

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

  console.log('🔍 MessagesPageWrapper - location.state:', location.state);
  console.log('🔍 MessagesPageWrapper - selectedApplicant:', selectedApplicant);

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
  console.log('🔥🔥🔥 APPCONTENT LIVE', new Date().toISOString());
  const { user, loading, isAdmin, profile } = useAuthContext();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [searchParams] = useSearchParams();
  const isResetFlow = searchParams.get('reset') === 'true' || location.hash.includes('type=recovery');
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

  // Helper to check if user is a company user
  const isCompanyUser = user && (user.user_metadata?.user_type === 'company' || user.user_metadata?.user_type === 'employer');

  return (
    <TrackingProvider>
      <div className="flex min-h-screen flex-col bg-slate-100 relative">
        <GDPRBanner />
        <Header
          onSignIn={() => handleOpenAuthModal('signin')}
          onJoinNow={() => handleOpenAuthModal('signup')}
        />
        <main className="flex-grow">
          <Routes>
            {/* Auth callback route - accessible to all users */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public routes - always available */}
            <Route path="/privacy-policy" element={<PrivacyPolicyWrapper />} />
            <Route path="/cookie-policy" element={<CookiePolicyWrapper />} />
            <Route path="/terms" element={<TermsOfServiceWrapper />} />
            <Route path="/data-request" element={<DataRequestFormWrapper />} />

            {/* Company routes - only for company users with separate layout */}
            {isCompanyUser ? (
              <>
                <Route path="/company-dashboard" element={<CompanyLayout><CompanyDashboardPage /></CompanyLayout>} />
                <Route path="/company-hiring/jobs" element={<CompanyLayout><CompanyJobsPage /></CompanyLayout>} />
                <Route path="/company-hiring/new" element={<CompanyLayout><CompanyNewJobPage /></CompanyLayout>} />
                <Route path="/company-hiring/applicants" element={<CompanyLayout><CompanyApplicantsPage /></CompanyLayout>} />
                <Route path="/company-referrals/incoming" element={<CompanyLayout><CompanyIncomingReferralsPage /></CompanyLayout>} />
                <Route path="/company-referrals/outgoing" element={<CompanyLayout><div>Outgoing Invites</div></CompanyLayout>} />
                <Route path="/company-referrals/partners" element={<CompanyLayout><div>My Partners</div></CompanyLayout>} />
                <Route path="/company-referrals/invite" element={<CompanyLayout><div>Invite Partner</div></CompanyLayout>} />
                <Route path="/company-profile/branding" element={<CompanyLayout><CompanyProfileBrandingPage /></CompanyLayout>} />
                <Route path="/company-profile/careers" element={<CompanyLayout><div>Careers Page Preview</div></CompanyLayout>} />
                <Route path="/company-profile/team" element={<CompanyLayout><div>Team & Access</div></CompanyLayout>} />
                <Route path="/company-profile/integrations" element={<CompanyLayout><div>Integrations & API Keys</div></CompanyLayout>} />
                <Route path="/company-settings/account" element={<CompanyLayout><div>Account (Email, Password, 2FA)</div></CompanyLayout>} />
                <Route path="/company-settings/notifications" element={<CompanyLayout><div>Notifications & Digests</div></CompanyLayout>} />
                <Route path="/company-settings/help" element={<CompanyLayout><div>Help & Support (Docs, Chat)</div></CompanyLayout>} />
                <Route path="/company-dashboard/activity" element={<CompanyLayout><div>Recent Activity Feed</div></CompanyLayout>} />
                <Route path="/company-dashboard/actions" element={<CompanyLayout><div>Quick Actions (Post Job, Invite Partner)</div></CompanyLayout>} />
              </>
            ) : null}

            {/* Regular user routes - for all authenticated users (including company users) */}
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
                <Route path="/accept-admin-invite" element={<AcceptAdminInvitePage />} />
                <Route path="*" element={<Navigate to="/jobs" replace />} />
              </>
            ) : null}

            {/* Public routes - for non-authenticated users */}
            {!user && (
              <>
                <Route path="/companies" element={<CompanyLandingPage />} />
                <Route path="/company-signup" element={<CompanySignupPage />} />
                <Route path="/company-login" element={<CompanyLoginPage />} />
                <Route path="/company-confirmation" element={<CompanyConfirmationPage />} />
                <Route path="/company-onboarding" element={<CompanyOnboardingPage />} />
                <Route path="/company-job-success" element={<CompanyJobSuccessPage />} />
                {/* Temporary route for testing Password Reset page */}
                <Route path="/reset-password" element={<PasswordResetPage />} />
                <Route path="/" element={<HomePageWrapper />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>
        {!(isMobile && location.pathname === '/messages') && <Footer />}

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={handleCloseAuthModal}
          mode={authModal.mode}
          onModeChange={handleAuthModeChange}
        />
      </div>
    </TrackingProvider>
  );
}

export default App;