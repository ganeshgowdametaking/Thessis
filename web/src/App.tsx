// THESSIS v2.0 - Enhanced UI/UX and Smart Messaging System
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from './components/Header';
import MobileNavigation from './components/MobileNavigation';
import { supabase } from './lib/supabase';
import { useMediaQuery } from 'react-responsive';
import LoadingSpinner from './components/LoadingSpinner';
import GDPRBanner from './components/GDPRBanner';
import Hero from './components/Hero';
import { HomeCompanyStrip, HomeHowItWorks, HomeFeatures, HomeFinalCta, HomeStickyCta } from './components/HomeSections';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy';
import TermsOfService from './components/TermsOfService';
import DataRequestForm from './components/DataRequestForm';
import PasswordResetPage from './components/PasswordResetPage';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import { useAuthContext } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';

// Lazy load heavy components
const JobsPage = React.lazy(() => import('./components/JobsPage'));
const CreateReferralPage = React.lazy(() => import('./components/CreateReferralPage'));
const ApplicationsPage = React.lazy(() => import('./components/ApplicationsPage'));
const SearchResultsPage = React.lazy(() => import('./components/SearchResultsPage'));
const MessagesPage = React.lazy(() => import('./components/MessagesPage'));
const NotificationsPage = React.lazy(() => import('./components/NotificationsPage'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
const OnboardingPage = React.lazy(() => import('./components/OnboardingPage'));
const UserProfilePage = React.lazy(() => import('./components/UserProfilePage'));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const AcceptAdminInvitePage = React.lazy(() => import('./components/AcceptAdminInvitePage'));
import AuthCallback from './components/AuthCallback';
import ScrollToTop from './components/ScrollToTop';
import { productAnalytics } from './services/productAnalytics';
import AnalyticsLifecycle from './components/AnalyticsLifecycle';

// Wrapper component for ApplicationsPage to handle React Router integration
function ApplicationsPageWrapper() {
  const { referralId } = useParams<{ referralId: string }>();
  const navigate = useNavigate();
  const [referralTitle, setReferralTitle] = useState('Job Referral');

  useEffect(() => {
    let isMounted = true;
    const fetchJobTitle = async (controller: AbortController) => {
      if (!referralId) {
        return;
      }

      try {
        const timeoutMs = 60000;
        const queryPromise = supabase
          .from('jobs')
          .select('title')
          .eq('id', referralId as any)
          .abortSignal(controller.signal)
          .single();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Job title request timed out')), timeoutMs)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<typeof queryPromise>;
        // Supabase returns a cancelled request as `{ error }` instead of throwing.
        if (controller.signal.aborted) return;

        if (error) throw error;
        if (data && isMounted) {
          setReferralTitle((data as any).title);
        }
      } catch (error: any) {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        console.error('Error fetching job title:', error);
      }
    };

    const controller = new AbortController();
    fetchJobTitle(controller);

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [referralId]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleMessage = (applicantId: string) => {
    // Navigate to messages page and pass applicantId as state, always include a unique timestamp
    navigate(`/messages?user=${encodeURIComponent(applicantId)}`, {
      state: { selectedApplicant: applicantId, msgNavTs: Date.now() }
    });
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  if (!referralId) {
    return <Navigate to="/jobs" />;
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
  const isPhone = useMediaQuery({ maxWidth: 767 });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchQuery = searchParams.get('q') || '';

  const handleBack = () => {
    navigate(-1);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  if (!searchQuery && !isPhone) {
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
function HomePageWrapper({ onJoinNow }: { onJoinNow?: () => void }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isResetFlow = searchParams.get('reset') === 'true' || location.hash.includes('type=recovery');

  if (isResetFlow) {
    return <PasswordResetPage />;
  }

  return (
    <>
      <Hero />
      <HomeCompanyStrip />
      <HomeHowItWorks />
      <HomeFeatures />
      <HomeFinalCta onJoinNow={() => { productAnalytics.capture('cta_clicked', {cta: 'signup', placement: 'final'}); onJoinNow?.(); }} />
      <HomeStickyCta onJoinNow={() => { productAnalytics.capture('cta_clicked', {cta: 'signup', placement: 'sticky'}); onJoinNow?.(); }} />
    </>
  );
}

// Add a wrapper for MessagesPage to read selectedApplicant from location state
function MessagesPageWrapper() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Read selectedApplicant from navigation state (if present)
  const selectedApplicant = location.state?.selectedApplicant || searchParams.get('user');

  return <MessagesPage selectedApplicant={selectedApplicant} />;
}

function App() {
  return (
    <LoadingProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
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
  const [resetFlowActive, setResetFlowActive] = useState(false);
  const isResetFlow = location.pathname === '/reset-password' || searchParams.get('reset') === 'true' || location.hash.includes('type=recovery') || resetFlowActive;
  const navigate = useNavigate();


  // Ref to track if we've already handled the initial redirect
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (location.pathname === '/reset-password' || searchParams.get('reset') === 'true' || location.hash.includes('type=recovery')) {
      setResetFlowActive(true);
    }
  }, [location.pathname, location.hash, searchParams]);

  useEffect(() => {
    // Only redirect if we are EXACTLY at the root and have the data, and haven't redirected yet
    if (!loading && user && isAdmin && location.pathname === '/' && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/analytics', { replace: true });
    }
  }, [isAdmin, loading, user, location.pathname, navigate]);

  const routes = useMemo(() => (
    <Routes>
      {/* Auth callback route - accessible to all users */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Public routes - always available */}
      <Route path="/privacy-policy" element={<PrivacyPolicyWrapper />} />
      <Route path="/cookie-policy" element={<CookiePolicyWrapper />} />
      <Route path="/terms" element={<TermsOfServiceWrapper />} />
      <Route path="/data-request" element={<DataRequestFormWrapper />} />
      <Route path="/accept-admin-invite" element={<AcceptAdminInvitePage />} />

      {/* Signed-in user routes */}
      {user ? (
        <>
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/create-referral" element={<CreateReferralPage />} />
          <Route path="/applications/:referralId" element={<ApplicationsPageWrapper />} />
          <Route path="/search-results" element={<SearchResultsPageWrapper key={location.search} />} />
          <Route path="/messages" element={<MessagesPageWrapper />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/user/:userId" element={<UserProfilePageWrapper />} />
          <Route path="/settings" element={<SettingsPageWrapper />} />
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </>
      ) : null}

      {/* Public routes - for non-authenticated users */}
      {!user && (
        <>
          {/* Temporary route for testing Password Reset page */}
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/login" element={<AuthPage key="signin" initialMode="signin" />} />
          <Route path="/signup" element={<AuthPage key="signup" initialMode="signup" />} />
          <Route path="/" element={<HomePageWrapper onJoinNow={() => navigate('/signup')} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  ), [user?.id, isAdmin]);

  // If this is a password reset flow, show the password reset page regardless of authentication status
  if (isResetFlow) {
    return (
      <div className="flex min-h-screen flex-col bg-parchment-sunken">
        <main className="flex-grow">
          <PasswordResetPage />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner text="Initializing..." />
      </div>
    );
  }

  const isHeroPage = !user && location.pathname === '/';
  const isAuthPage = !user && (location.pathname === '/login' || location.pathname === '/signup');
  const isOnboardingPage = location.pathname === '/onboarding';
  // Legal pages keep the header on phones so visitors always have a way back.
  const isLegalPage = ['/privacy-policy', '/terms', '/cookie-policy'].includes(location.pathname);
  const showMobileNavigation = isMobile && Boolean(user) && !isOnboardingPage && !isLegalPage;

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-parchment">
        <React.Suspense fallback={
          <div className="min-h-screen w-full flex items-center justify-center">
            <LoadingSpinner text="Loading page..." />
          </div>
        }>
          {routes}
        </React.Suspense>
      </div>
    );
  }

  return (
    // <TrackingProvider>
    <div className={`${showMobileNavigation ? 'mobile-app ' : ''}flex min-h-screen flex-col relative ${isHeroPage || isLegalPage ? 'bg-parchment' : 'bg-parchment-sunken'}`}>
      <AnalyticsLifecycle />
      <GDPRBanner />
      {!isOnboardingPage && (!isMobile || isHeroPage || isLegalPage) && (
        <Header
          onSignIn={() => { productAnalytics.capture('cta_clicked', {cta: 'login', placement: 'header'}); navigate('/login'); }}
          onJoinNow={() => { productAnalytics.capture('cta_clicked', {cta: 'signup', placement: 'header'}); navigate('/signup'); }}
        />
      )}
      {showMobileNavigation && <MobileNavigation />}
      <main className={showMobileNavigation ? "mobile-app-main flex-grow" : "flex-grow"}>
        <React.Suspense fallback={
          <div className="min-h-screen w-full flex items-center justify-center">
            <LoadingSpinner text="Loading page..." />
          </div>
        }>
          {routes}
        </React.Suspense>
      </main>
      {!showMobileNavigation && !(isMobile && location.pathname === '/messages') && (
        <Footer compact={isMobile} slim={Boolean(user)} />
      )}

    </div>
    // </TrackingProvider>
  );
}

export default App;
