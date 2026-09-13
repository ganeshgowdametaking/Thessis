// THESSIS v2.0 - Enhanced UI/UX and Smart Messaging System
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from './components/Header';
import { supabase } from './lib/supabase';
import { useMediaQuery } from 'react-responsive';
import LoadingSpinner from './components/LoadingSpinner';
import GDPRBanner from './components/GDPRBanner';
import Hero from './components/Hero';
import ReferralStats from './components/ReferralStats';
import ReferralCards from './components/ReferralCards';
import Services from './components/Services';
import About from './components/About';
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
const CompanyDashboardPage = React.lazy(() => import('./components/CompanyDashboardPage'));
const CompanyJobsPage = React.lazy(() => import('./components/CompanyJobsPage'));
const CompanyNewJobPage = React.lazy(() => import('./components/CompanyNewJobPage'));
const CompanyApplicantsPage = React.lazy(() => import('./components/CompanyApplicantsPage'));
const CompanyIncomingReferralsPage = React.lazy(() => import('./components/CompanyIncomingReferralsPage'));
const CompanyProfileBrandingPage = React.lazy(() => import('./components/CompanyProfileBrandingPage'));
const CompanyOnboardingPage = React.lazy(() => import('./components/CompanyOnboardingPage'));
const CompanyJobSuccessPage = React.lazy(() => import('./components/CompanyJobSuccessPage'));
const CompanySignupPage = React.lazy(() => import('./components/CompanySignupPage'));
const CompanyLoginPage = React.lazy(() => import('./components/CompanyLoginPage'));
const CompanyConfirmationPage = React.lazy(() => import('./components/CompanyConfirmationPage'));
const CompanyLandingPage = React.lazy(() => import('./components/CompanyLandingPage'));
const AcceptAdminInvitePage = React.lazy(() => import('./components/AcceptAdminInvitePage'));
import AuthCallback from './components/AuthCallback';
import ScrollToTop from './components/ScrollToTop';
import CompanyLayout from './components/CompanyLayout';
import { analyticsService } from './services/analyticsService';
import { captureUTMParams } from './utils/utmHandler';

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

        if (error) throw error;
        if (data && isMounted) {
          setReferralTitle((data as any).title);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
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
      <div className="relative overflow-hidden bg-parchment -mt-20 pt-20">
        {/* Decorative background: grid + glow, spanning the hero section AND the
            spacer below it so the effect doesn't cut off partway down. Pulled up
            by -mt-20/pt-20 (net-zero shift for Hero itself) so the background box
            extends behind the 80px sticky header too — Header has z-50 so it still
            renders on top regardless of this wrapper's DOM order. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.38) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.38) 2px, transparent 2px)',
            backgroundSize: '68px 68px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 z-0 h-[433px] w-[433px] rounded-full bg-gold/70 blur-2xl sm:h-[541px] sm:w-[541px] lg:-top-32 lg:-right-24 lg:h-[649px] lg:w-[649px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 z-0 h-[433px] w-[433px] rounded-full bg-gold/70 blur-2xl sm:h-[541px] sm:w-[541px] lg:-bottom-32 lg:-left-24 lg:h-[649px] lg:w-[649px]"
        />
        {/* Clear zone: fades the grid/glow out behind the headline. Positioned by a
            fixed pixel offset from the top (not a % of this container's height),
            since the spacer below is viewport-height-dependent and would otherwise
            shift the text's relative position unpredictably. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] [--clear-y:108px] sm:[--clear-y:100px] lg:[--clear-y:116px]"
          style={{
            background:
              'radial-gradient(ellipse clamp(320px,90vw,900px) clamp(150px,30vw,170px) at 50% var(--clear-y), #F8F9FC 0%, #F8F9FC 75%, rgba(248,249,252,0) 100%)',
          }}
        />
        <Hero onJoinNow={onJoinNow} />
        <div
          aria-hidden="true"
          className="min-h-[calc(100dvh-242px)] sm:min-h-[calc(100dvh-264px)] lg:min-h-[calc(100dvh-320px)]"
        />
        <ReferralCards />
      </div>
      <ReferralStats />
      <div className="relative overflow-hidden bg-parchment">
        {/* Same decorative background as above, resumed on the other side of the
            dark stats band. Two separate wrapper instances, not one continuous
            element spanning the dark section — visually reads as the same
            background continuing, without needing to punch a hole through
            ReferralStats' own dark section to do it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.38) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.38) 2px, transparent 2px)',
            backgroundSize: '68px 68px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 z-0 h-[433px] w-[433px] rounded-full bg-gold/70 blur-2xl sm:h-[541px] sm:w-[541px] lg:-top-32 lg:-right-24 lg:h-[649px] lg:w-[649px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 z-0 h-[433px] w-[433px] rounded-full bg-gold/70 blur-2xl sm:h-[541px] sm:w-[541px] lg:-bottom-32 lg:-left-24 lg:h-[649px] lg:w-[649px]"
        />
        {/* Clear zone behind the "Better Referrals" heading, same fixed-offset
            approach as Hero's — values are placeholders until measured against
            the real rendered position. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] [--clear-y:138px] md:[--clear-y:142px]"
          style={{
            background:
              'radial-gradient(ellipse clamp(320px,90vw,900px) clamp(120px,20vw,160px) at 50% var(--clear-y), #F8F9FC 0%, #F8F9FC 75%, rgba(248,249,252,0) 100%)',
          }}
        />
        <Services />
      </div>
      <About />
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


  // Initialize analytics and capture UTM params
  useEffect(() => {
    analyticsService.init();
    analyticsService.trackPageView(window.location.pathname);

    // Capture UTM parameters from URL and persist to localStorage
    captureUTMParams();
  }, []);

  // Track page views on location change
  useEffect(() => {
    analyticsService.trackPageView(location.pathname);
  }, [location.pathname]);


  // Helper to check if user is a company user
  const isCompanyUser = user && (user.user_metadata?.user_type === 'company' || user.user_metadata?.user_type === 'employer');

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
          <Route path="/login" element={<AuthPage key="signin" initialMode="signin" />} />
          <Route path="/signup" element={<AuthPage key="signup" initialMode="signup" />} />
          <Route path="/" element={<HomePageWrapper onJoinNow={() => navigate('/signup')} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  ), [user?.id, isAdmin, isCompanyUser]);

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
    <div className={`flex min-h-screen flex-col relative ${isHeroPage ? 'bg-parchment' : 'bg-parchment-sunken'}`}>
      <GDPRBanner />
      {!isOnboardingPage && (!isMobile || location.pathname === '/jobs' || isHeroPage) && (
        <Header
          onSignIn={() => navigate('/login')}
          onJoinNow={() => navigate('/signup')}
        />
      )}
      <main className="flex-grow">
        <React.Suspense fallback={
          <div className="min-h-screen w-full flex items-center justify-center">
            <LoadingSpinner text="Loading page..." />
          </div>
        }>
          {routes}
        </React.Suspense>
      </main>
      {!(isMobile && location.pathname === '/messages') && (
        <Footer compact={isMobile} slim={Boolean(user)} />
      )}

    </div>
    // </TrackingProvider>
  );
}

export default App;
