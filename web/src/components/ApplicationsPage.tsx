import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { applicationService } from '../services/applicationService';
import { useMediaQuery } from 'react-responsive';
import { useAuthContext } from '../contexts/AuthContext';

interface Application {
  id: string;
  applicant_id: string;
  job_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  cover_letter?: string;
  resume_url?: string;
  rating?: number | null;
  shortlisted?: boolean;
  notes?: string | null;
  ai_score?: number | null;
  ai_semantic_score?: number | null;
  ai_skill_score?: number | null;
  ai_rationale?: string | null;
  ai_ranked_at?: string | null;
  assigned_referrer_id?: string | null;
  assignment_expires_at?: string | null;
  // Mapped fields for compatibility
  user_id?: string;
  created_at?: string;
  user_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    current_company?: string;
    current_position?: string;
    location?: string;
    linkedin_url?: string;
    phone?: string;
    skills?: string[];
    // Original profile fields
    company?: string;
    title?: string;
  };
}

interface ApplicationsPageProps {
  referralId: string;
  referralTitle: string;
  onBack: () => void;
  onMessage: (applicantId: string) => void;
  onViewProfile: (userId: string) => void;
}

export default function ApplicationsPage({
  referralId,
  referralTitle,
  onBack,
  onMessage,
  onViewProfile
}: ApplicationsPageProps) {
  const { user } = useAuthContext();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'earliest' | 'latest'>('earliest');
  const [aiRankingLoading, setAiRankingLoading] = useState(false);
  const [aiRankingError, setAiRankingError] = useState<string | null>(null);
  const [aiRankingFailures, setAiRankingFailures] = useState<{ name: string; reason: string }[]>([]);
  const [aiLastUpdatedAt, setAiLastUpdatedAt] = useState<string | null>(null);
  const [aiLastRunKey, setAiLastRunKey] = useState<string>('');
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removalMode, setRemovalMode] = useState<'delete' | 'unshortlist'>('delete');
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Default targets the Vercel Python function at api/rank-application.py —
  // deployed alongside the rest of the site, no separate service/billing.
  const configuredRankingApi = (import.meta.env.VITE_RESUME_RANKING_API || '/api').trim();
  const resumeRankingApiBase = configuredRankingApi.replace(/\/+$/, '');

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(controller);
    return () => controller.abort();
  }, [referralId]);

  const fetchApplications = async (controller?: AbortController, options?: { silent?: boolean }) => {
    const fetchController = controller || new AbortController();
    const silent = options?.silent ?? false;
    try {
      if (!silent) setLoading(true);
      setError(null);

      const timeoutMs = 60000;
      const queryPromise = (supabase
        .from('applications') as any)
        .select(`
          id,
          applicant_id,
          job_id,
          status,
          applied_at,
          updated_at,
          cover_letter,
          resume_url,
          rating,
          shortlisted,
          notes,
          assigned_referrer_id,
          assignment_expires_at,
          ai_score,
          ai_semantic_score,
          ai_skill_score,
          ai_rationale,
          ai_ranked_at,
          user_profile:profiles!applications_applicant_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            company,
            title,
            location
          )
        `)
        .eq('job_id', referralId)
        .order('applied_at', { ascending: false })
        .abortSignal(fetchController.signal)
        .range(0, 19);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Applications request timed out')), timeoutMs)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      const data = result?.data;
      const error = result?.error;

      if (error) {
        throw error;
      }

      const mappedData = (data || []).map((app: any) => ({
        ...app,
        user_id: app.applicant_id,
        created_at: app.applied_at,
        user_profile: app.user_profile ? {
          ...app.user_profile,
          current_company: app.user_profile.company,
          current_position: app.user_profile.title
        } : null
      }));
      setApplications(mappedData as Application[]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching applications:', err);
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load applications');
        setApplications([]);
      }
    } finally {
      if (!fetchController.signal.aborted && !silent) {
        setLoading(false);
      }
    }
  };

  const getValidApplications = () =>
    applications.filter((application) => {
      const hasEmail = Boolean(application.user_profile?.email);
      const hasName = Boolean(application.user_profile?.full_name);
      const hasResume = Boolean(application.resume_url);
      return hasEmail && hasName && hasResume;
    });

  const buildAiRunKey = () => {
    const serial = getValidApplications()
      .map((application) => `${application.id}:${application.updated_at || application.applied_at || (application as any).created_at || ''}`)
      .sort()
      .join('|');
    return `${referralId}|${serial}`;
  };

  // Ranks applicants one request per applicant (small concurrency cap) — the
  // ranking service scores synchronously and writes the result straight onto
  // applications.ai_* columns, so there's no job-creation or leaderboard
  // polling step anymore; a plain re-fetch afterward picks the scores up.
  // Kept low (rather than e.g. 5) because Supabase's free-tier compute has a
  // small connection pool — too many simultaneous RPC calls can exhaust it
  // and cause transient 502/504s, which the retry below also guards against.
  const RANKING_CONCURRENCY = 3;
  const RETRYABLE_STATUS = new Set([502, 503, 504]);
  const RETRY_DELAY_MS = 1500;

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // The ranking API's error responses are `{"error": "..."}` with a short,
  // already human-readable message (the backend is responsible for never
  // putting raw upstream detail — HTML pages, storage JSON errors — in this
  // field). This just strips the leading "(502) " status prefix and unwraps
  // the JSON envelope.
  const extractErrorReason = (rawMessage: string): string => {
    const jsonStart = rawMessage.indexOf('{');
    if (jsonStart !== -1) {
      try {
        const parsed = JSON.parse(rawMessage.slice(jsonStart));
        if (typeof parsed?.error === 'string') {
          return parsed.error;
        }
      } catch {
        // fall through to raw-text handling below
      }
    }
    return rawMessage.length > 140 ? `${rawMessage.slice(0, 140)}…` : rawMessage;
  };

  const handleRunAiRanking = async () => {
    try {
      setAiRankingLoading(true);
      setAiRankingError(null);
      setAiRankingFailures([]);

      if (!resumeRankingApiBase) {
        setAiRankingError('AI ranking service is not configured. Set VITE_RESUME_RANKING_API to your deployed ranking API URL.');
        return;
      }

      const validApplications = getValidApplications();
      if (validApplications.length === 0) {
        setAiRankingError('No applicants with complete profile/email/resume data were found.');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setAiRankingError('Your session has expired. Please sign in again.');
        return;
      }

      let succeeded = 0;
      let lastError: string | null = null;
      const failures: { name: string; reason: string }[] = [];
      const queue = [...validApplications];

      const rankOnce = (application: Application) =>
        fetch(`${resumeRankingApiBase}/rank-application?applicationId=${application.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

      const worker = async () => {
        while (queue.length > 0) {
          const application = queue.shift();
          if (!application) continue;
          try {
            let res = await rankOnce(application);
            if (!res.ok && RETRYABLE_STATUS.has(res.status)) {
              // Likely transient contention on Supabase's free-tier connection
              // pool (concurrent RPC calls briefly exhausting it) rather than
              // a real failure — one retry after a short pause resolves most
              // of these without surfacing an error to the user at all.
              await pause(RETRY_DELAY_MS);
              res = await rankOnce(application);
            }
            if (!res.ok) {
              const body = await res.text().catch(() => '');
              throw new Error(`(${res.status}) ${body}`.trim());
            }
            succeeded += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            lastError = message;
            failures.push({
              name: application.user_profile?.full_name || 'Unknown applicant',
              reason: extractErrorReason(message),
            });
            console.warn(`Ranking failed for application ${application.id}:`, err);
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(RANKING_CONCURRENCY, validApplications.length) }, () => worker())
      );

      if (succeeded === 0) {
        throw new Error(
          lastError
            ? `Could not rank any applicants. Last error: ${lastError}`
            : 'Could not rank any applicants.'
        );
      }

      // Silent: this is a background refresh after ranking, not the page's
      // initial load — it must not trip the full-page loading spinner that
      // `fetchApplications()` normally shows (that spinner replaces the
      // entire page, which felt like a full reload for what should just be
      // the ranking panel updating in place).
      await fetchApplications(undefined, { silent: true });
      setAiLastUpdatedAt(new Date().toISOString());
      setAiRankingFailures(failures);

      if (succeeded < validApplications.length) {
        setAiRankingError(`Ranked ${succeeded} of ${validApplications.length} applicants — ${failures.length} could not be scored.`);
      }
    } catch (runError) {
      const message =
        runError instanceof TypeError && runError.message.includes('Failed to fetch')
          ? `AI ranking service is unreachable at ${resumeRankingApiBase}. Check VITE_RESUME_RANKING_API and CORS/network settings.`
          : runError instanceof Error
            ? runError.message
            : 'Failed to run AI ranking.';
      setAiRankingError(message);
    } finally {
      setAiRankingLoading(false);
    }
  };

  // Manual trigger for AI ranking instead of automatic to save resources and improve initial load
  const canRunAiRanking = useMemo(() => {
    const runKey = buildAiRunKey();
    const validCount = getValidApplications().length;
    return !loading && !aiRankingLoading && runKey && runKey !== aiLastRunKey && validCount > 0;
  }, [applications, referralId, loading, aiRankingLoading, aiLastRunKey]);

  const triggerAiRanking = () => {
    if (canRunAiRanking) {
      setAiLastRunKey(buildAiRunKey());
      void handleRunAiRanking();
    }
  };

  const handleViewResume = async (application: Application) => {
    let resumeUrl = (application as any).resume_url;

    if (!resumeUrl) {
      try {
        const { data, error } = await (supabase
          .from('applications') as any)
          .select('resume_url')
          .eq('id', application.id)
          .single();

        if (error) throw error;
        resumeUrl = data?.resume_url || undefined;
      } catch (err) {
        console.error('Error fetching resume URL:', err);
      }
    }

    if (!resumeUrl) {
      alert('No resume available for this application.');
      return;
    }

    try {
      // If it's a base64 data URL, open it in a new tab
      if (resumeUrl && resumeUrl.startsWith('data:')) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>Resume - ${application.user_profile?.full_name}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f5f5f5;">
                <embed src="${resumeUrl}" width="100%" height="100%" type="application/pdf" />
              </body>
            </html>
          `);
        }
      } else if (resumeUrl) {
        // If it's a URL, open it directly
        window.open(resumeUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      alert('Unable to view resume. Please try downloading instead.');
    }
  };

  const handleDownloadResume = async (application: Application) => {
    let resumeUrl = (application as any).resume_url;

    if (!resumeUrl) {
      try {
        const { data, error } = await (supabase
          .from('applications') as any)
          .select('resume_url')
          .eq('id', application.id)
          .single();

        if (error) throw error;
        resumeUrl = data?.resume_url || undefined;
      } catch (err) {
        console.error('Error fetching resume URL:', err);
      }
    }

    if (!resumeUrl) {
      alert('No resume available for this application.');
      return;
    }

    try {
      const fileName = `${application.user_profile?.full_name?.replace(/\s+/g, '_') || 'Resume'}_${new Date().getFullYear()}.pdf`;

      if (resumeUrl && resumeUrl.startsWith('data:')) {
        // Handle base64 data
        const link = document.createElement('a');
        link.href = resumeUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (resumeUrl) {
        // Handle URL
        const link = document.createElement('a');
        link.href = resumeUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Unable to download resume. Please try again.');
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      const response = await (supabase
        .from('applications') as any)
        .update({
          status: newStatus,
          shortlisted: newStatus === 'shortlisted' || newStatus === 'referred'
        } as any)
        .eq('id', applicationId);

      const error = (response as any).error;

      if (error) throw error;

      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status: newStatus, shortlisted: newStatus === 'shortlisted' || newStatus === 'referred' }
            : app
        )
      );
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleAcceptAssignment = async (applicationId: string) => {
    try {
      const { error } = await supabase.rpc('accept_referral_assignment' as any, {
        p_application_id: applicationId,
      } as any);
      if (error) throw error;

      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status: 'referred', shortlisted: true, assignment_expires_at: null }
            : app
        )
      );
    } catch (error) {
      console.error('Error accepting assignment:', error);
    }
  };

  const handleRejectAssignment = async (applicationId: string) => {
    try {
      const { error } = await supabase.rpc('reject_referral_assignment' as any, {
        p_application_id: applicationId,
      } as any);
      if (error) throw error;

      // Rejecting hands the candidate to the next referrer in the pool —
      // it's no longer this referrer's to see, so drop it from the list
      // rather than showing a stale "assigned to you" state.
      setApplications(prev => prev.filter(app => app.id !== applicationId));
    } catch (error) {
      console.error('Error rejecting assignment:', error);
    }
  };

  const handleDeleteApplication = (application: Application) => {
    setRemovalMode(activeTab === 'shortlisted' ? 'unshortlist' : 'delete');
    setApplicationToDelete(application);
  };

  const confirmDelete = async () => {
    if (!applicationToDelete) return;

    try {
      setIsDeleting(true);
      if (removalMode === 'unshortlist') {
        const { error } = await supabase
          .from('applications')
          .update({ status: 'pending', shortlisted: false })
          .eq('id', applicationToDelete.id);

        if (error) throw error;

        setApplications(prev =>
          prev.map(app =>
            app.id === applicationToDelete.id
              ? { ...app, status: 'pending', shortlisted: false }
              : app
          )
        );
      } else {
        await applicationService.deleteApplication(applicationToDelete.id);
        setApplications(prev => prev.filter(app => app.id !== applicationToDelete.id));
      }

      if (selectedApplication?.id === applicationToDelete.id) {
        setSelectedApplication(null);
      }
      setApplicationToDelete(null);
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Failed to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      if (diffHours < 1) return 'Just now';
      return `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Applied yesterday';
    if (diffDays < 7) return `Applied ${diffDays} days ago`;
    return `Applied ${date.toLocaleDateString()}`;
  };

  const topRankedApplications = useMemo(() => {
    if (applications.length === 0) return [] as Application[];

    const ranked = applications
      .filter((application) => typeof application.ai_score === 'number')
      .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
      .slice(0, 5);

    if (ranked.length > 0) {
      return ranked;
    }

    // Fallback source: existing manual rating field, if set.
    return [...applications]
      .filter((application) => typeof application.rating === 'number')
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }, [applications]);

  const filteredApplications = applications.filter(app => {
    const matchesTopRanked = activeTab === 'top_ranked'
      ? topRankedApplications.some((ranked) => ranked.id === app.id)
      : true;
    const matchesTab = activeTab === 'top_ranked' || activeTab === 'all' || app.status === activeTab;
    const matchesSearch = !searchQuery ||
      app.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_profile?.current_company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTopRanked && matchesTab && matchesSearch;
  });

  const sortedApplications = useMemo(() => {
    const getTimestamp = (application: Application) =>
      new Date(application.created_at || (application as any).applied_at || application.updated_at || 0).getTime();

    return [...filteredApplications].sort((a, b) => {
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      return sortOrder === 'earliest' ? aTime - bTime : bTime - aTime;
    });
  }, [filteredApplications, sortOrder]);

  const getStatusCounts = () => {
    const counts = {
      top_ranked: topRankedApplications.length,
      all: applications.length,
      shortlisted: applications.filter(app => app.status === 'shortlisted').length,
      referred: applications.filter(app => app.status === 'referred').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner text="Loading applications..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment flex flex-col overflow-hidden">
      {/* Page Header */}
      <header className="bg-parchment pt-5 md:pt-8 pb-3 md:pb-4 px-4 md:px-8 shrink-0 z-10">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{referralTitle}</h1>
              </div>
              <p className="text-slate-500 font-medium">
                <span className="text-ink font-semibold">{applications.length} Applicants</span>
              </p>
            </div>

            <div className="flex gap-3">
              {/* Add Candidate button removed */}
            </div>
          </div>

          {/* Tabs and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-2 border-b border-slate-200 pb-1">
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              <button
                className={`flex items-center gap-2 pb-3 border-b-2 px-1 ${activeTab === 'all'
                  ? 'border-[#4353FF] text-ink'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('all')}
              >
                <span className="font-bold text-sm">All</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'all'
                  ? 'bg-ink text-white'
                  : 'bg-parchment-sunken text-slate-600'
                  }`}>
                  {statusCounts.all}
                </span>
              </button>

              <button
                className={`flex items-center gap-2 pb-3 border-b-2 px-1 ${activeTab === 'shortlisted'
                  ? 'border-[#4353FF] text-ink'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('shortlisted')}
              >
                <span className="font-medium text-sm">Shortlisted</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'shortlisted'
                  ? 'bg-ink text-white'
                  : 'bg-parchment-sunken text-slate-600'
                  }`}>
                  {statusCounts.shortlisted}
                </span>
              </button>

              <button
                className={`flex items-center gap-2 pb-3 border-b-2 px-1 ${activeTab === 'referred'
                  ? 'border-[#4353FF] text-ink'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('referred')}
              >
                <span className="font-medium text-sm">Referred</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'referred'
                  ? 'bg-ink text-white'
                  : 'bg-parchment-sunken text-slate-600'
                  }`}>
                  {statusCounts.referred}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 pb-2 w-full lg:w-auto">
              <button
                className="h-10 px-4 rounded-lg bg-white border border-transparent hover:border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-semibold transition-all whitespace-nowrap"
                onClick={() => setSortOrder((prev) => (prev === 'earliest' ? 'latest' : 'earliest'))}
                title="Toggle applicant sort order"
              >
                <span className="material-symbols-outlined text-[20px]">sort</span>
                {sortOrder === 'earliest' ? 'Earliest First' : 'Latest First'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Applications Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-800">{error}</p>
              <button
                className="h-8 px-3 rounded-lg bg-white border border-amber-200 text-amber-800 text-xs font-semibold"
                onClick={() => fetchApplications()}
              >
                Retry
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg p-4 md:p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2 md:mb-3">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900">AI Resume Ranking</h2>
                {aiLastUpdatedAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last updated: {new Date(aiLastUpdatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
                {aiRankingLoading && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    AI Ranking In Progress
                  </span>
                )}
                {canRunAiRanking && (
                  <button
                    onClick={triggerAiRanking}
                    disabled={aiRankingLoading}
                    className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    Update AI Rankings
                  </button>
                )}
              </div>
            </div>

            {aiRankingError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
                {aiRankingError}
              </div>
            )}

            {aiRankingFailures.length > 0 && (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                <p className="font-semibold mb-1">Could not score:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  {aiRankingFailures.map((failure, index) => (
                    <li key={index}>
                      <span className="font-medium">{failure.name}</span> — {failure.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {applications.some((application) => typeof application.ai_score === 'number') && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-parchment-sunken rounded-lg p-3">
                    <p className="text-xs text-slate-500">Ranked</p>
                    <p className="text-lg font-bold font-display text-slate-900">
                      {applications.filter((application) => typeof application.ai_score === 'number').length}
                    </p>
                  </div>
                  <div className="bg-parchment-sunken rounded-lg p-3">
                    <p className="text-xs text-slate-500">Unranked</p>
                    <p className="text-lg font-bold font-display text-slate-900">
                      {applications.filter((application) => typeof application.ai_score !== 'number').length}
                    </p>
                  </div>
                </div>

                <div className="bg-parchment rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">
                      Top Ranked Candidates ({topRankedApplications.length} shown)
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {topRankedApplications.map((application, index) => (
                      <div key={application.id} className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {index + 1}. {application.user_profile?.full_name || 'Unknown'}{' '}
                          <span className="text-ink">({(application.ai_score ?? application.rating ?? 0).toFixed(2)}{typeof application.ai_score === 'number' ? '%' : ''})</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{application.ai_rationale || 'No rationale available.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {sortedApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">
                {searchQuery ? 'No applicants match your search' : 'No applications yet'}
              </p>
            </div>
          ) : (
            <div className="w-full md:w-[90%] md:mx-auto space-y-3 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 md:gap-5">
              {sortedApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-white rounded-lg p-4 md:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow border border-slate-100 flex flex-col h-full group relative"
                >
                  {/* Profile Header */}
                  <div className="flex justify-between items-start mb-4">
                    <button
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      onClick={() => application.user_id && onViewProfile(application.user_id)}
                    >
                      <div className="h-12 w-12 rounded-full bg-cover bg-center bg-parchment-sunken flex items-center justify-center overflow-hidden">
                        <img
                          src={application.user_profile?.avatar_url || '/default-avatar.svg'}
                          alt={application.user_profile?.full_name || 'User'}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {application.user_profile?.full_name || 'Unknown User'}
                        </h3>
                      </div>
                    </button>
                    <button
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      onClick={() => handleDeleteApplication(application)}
                      title="Remove Applicant"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>{application.user_profile?.location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span>{formatDate(application.created_at || (application as any).applied_at || new Date().toISOString())}</span>
                    </div>
                  </div>

                  {/* Cover Letter Preview */}
                  {application.cover_letter && (
                    <div className="mb-5 bg-parchment-sunken p-3 rounded-lg">
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed italic">
                        "{application.cover_letter}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex flex-col gap-2">
                    {application.assigned_referrer_id === user?.id && application.status === 'pending' && application.assignment_expires_at ? (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold text-amber-800">
                          Assigned to you — respond by {formatDate(application.assignment_expires_at)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white transition-colors"
                            onClick={() => handleAcceptAssignment(application.id)}
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Accept
                          </button>
                          <button
                            className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => handleRejectAssignment(application.id)}
                          >
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                            Reject
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className={`w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${application.status === 'referred'
                          ? 'bg-parchment-sunken text-slate-700 cursor-default'
                          : 'bg-primary hover:bg-primary-hover text-white'
                          }`}
                        onClick={() => {
                          if (application.status === 'shortlisted') {
                            handleStatusUpdate(application.id, 'referred');
                            return;
                          }
                          if (application.status !== 'referred') {
                            handleStatusUpdate(application.id, 'shortlisted');
                          }
                        }}
                        disabled={application.status === 'referred'}
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        {application.status === 'shortlisted' ? 'Refer' : application.status === 'referred' ? 'Referred' : 'Shortlist'}
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        className="bg-white border border-slate-200 hover:bg-parchment-sunken text-slate-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        View Details
                      </button>
                      <button
                        className="bg-white border border-slate-200 hover:bg-parchment-sunken text-slate-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        onClick={() => onMessage(application.applicant_id)}
                      >
                        <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resume Modal */}
      {selectedApplication && (
        <div className={`fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-sm ${isMobile ? 'items-end justify-stretch p-0' : 'items-center justify-center p-4'}`}>
          <div className={`bg-white w-full shadow-2xl flex flex-col overflow-hidden ${isMobile ? 'max-h-[50vh] rounded-t-2xl rounded-b-none' : 'max-w-3xl max-h-[90vh] rounded-xl'}`}>
            <div className={`flex items-center justify-between border-b border-slate-100 shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center gap-4">
                <div className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} rounded-full bg-cover bg-center bg-parchment-sunken flex items-center justify-center overflow-hidden`}>
                  <img
                    src={selectedApplication.user_profile?.avatar_url || '/default-avatar.svg'}
                    alt={selectedApplication.user_profile?.full_name || 'User'}
                    className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} rounded-full object-cover`}
                  />
                </div>
                <div>
                  <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-slate-900`}>
                    {selectedApplication.user_profile?.full_name || 'Unknown User'}
                  </h2>
                  {(selectedApplication.user_profile?.current_position || selectedApplication.user_profile?.current_company) && (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
                      {selectedApplication.user_profile?.current_position}
                      {selectedApplication.user_profile?.current_position && selectedApplication.user_profile?.current_company && ' at '}
                      {selectedApplication.user_profile?.current_company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-slate-400 hover:bg-parchment-sunken rounded-lg transition-colors"
                  onClick={() => setSelectedApplication(null)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-8'}`}>
              <div className={isMobile ? 'flex flex-col gap-6' : 'grid grid-cols-3 gap-8'}>
                <div className={`${isMobile ? 'flex flex-col gap-6' : 'col-span-1 flex flex-col gap-6 border-r border-slate-100 pr-8'}`}>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-slate-600 text-sm">
                        <span className="material-symbols-outlined text-ink">mail</span>
                        <span>{selectedApplication.user_profile?.email}</span>
                      </div>
                      {selectedApplication.user_profile?.phone && (
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                          <span className="material-symbols-outlined text-ink">phone</span>
                          <span>{selectedApplication.user_profile.phone}</span>
                        </div>
                      )}
                      {selectedApplication.user_profile?.linkedin_url && (
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                          <span className="material-symbols-outlined text-ink">link</span>
                          <a className="text-ink hover:underline" href={selectedApplication.user_profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                            LinkedIn Profile
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedApplication.user_profile?.skills && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.user_profile.skills.map((skill, index) => (
                          <span key={index} className="bg-parchment-sunken text-slate-600 text-xs px-2 py-1 rounded-lg">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={isMobile ? 'flex flex-col gap-6' : 'col-span-2 flex flex-col gap-8'}>
                  {selectedApplication.cover_letter && (
                    <section>
                      <h3 className="text-lg font-bold font-display text-slate-900 mb-2">Cover Letter</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {selectedApplication.cover_letter}
                      </p>
                    </section>
                  )}
                </div>
              </div>
            </div>

            <div className={`border-t border-slate-100 bg-parchment-sunken/50 shrink-0 ${isMobile ? 'p-3 flex flex-col-reverse gap-2' : 'p-4 flex justify-end gap-3'}`}>
              <button
                className={`${isMobile ? 'w-full' : ''} px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white transition-colors`}
                onClick={() => setSelectedApplication(null)}
              >
                Dismiss
              </button>
              <button
                className={`${isMobile ? 'w-full justify-center' : ''} px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-parchment-sunken transition-colors flex items-center gap-2`}
                onClick={() => handleDownloadResume(selectedApplication)}
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Resume
              </button>
              {selectedApplication.assigned_referrer_id === user?.id && selectedApplication.status === 'pending' && selectedApplication.assignment_expires_at ? (
                <>
                  <button
                    className={`${isMobile ? 'w-full justify-center' : ''} px-5 py-2.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2`}
                    onClick={() => {
                      handleRejectAssignment(selectedApplication.id);
                      setSelectedApplication(null);
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    Reject
                  </button>
                  <button
                    className={`${isMobile ? 'w-full justify-center' : ''} px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2`}
                    onClick={() => {
                      handleAcceptAssignment(selectedApplication.id);
                      setSelectedApplication(null);
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Accept
                  </button>
                </>
              ) : (
                <button
                  className={`${isMobile ? 'w-full justify-center' : ''} px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${selectedApplication.status === 'referred'
                    ? 'bg-parchment-sunken text-slate-700 cursor-default'
                    : 'bg-primary text-white hover:bg-primary-hover'
                    }`}
                  onClick={() => {
                    if (selectedApplication.status === 'shortlisted') {
                      handleStatusUpdate(selectedApplication.id, 'referred');
                    } else {
                      if (selectedApplication.status !== 'referred') {
                        handleStatusUpdate(selectedApplication.id, 'shortlisted');
                      }
                    }
                    setSelectedApplication(null);
                  }}
                  disabled={selectedApplication.status === 'referred'}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {selectedApplication.status === 'shortlisted' ? 'Refer' : selectedApplication.status === 'referred' ? 'Referred' : 'Shortlist Candidate'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {applicationToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isDeleting && setApplicationToDelete(null)}
          ></div>
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-600 text-[32px]">delete_forever</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Applicant?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {removalMode === 'unshortlist' ? (
                  <>Are you sure you want to remove <strong>{applicationToDelete.user_profile?.full_name}</strong> from the shortlisted section?</>
                ) : (
                  <>Are you sure you want to remove <strong>{applicationToDelete.user_profile?.full_name}</strong>? This action will permanently delete their application.</>
                )}
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                className="flex-1 px-6 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-100 disabled:opacity-50"
                onClick={() => setApplicationToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="size-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                ) : (
                  'Yes, Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
