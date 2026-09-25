import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { applicationService } from '../services/applicationService';
import { useMediaQuery } from 'react-responsive';
import { useAuthContext } from '../contexts/AuthContext';
import { AlertCircle, ArrowLeft, ArrowUpDown, Check, Clock, Download, FileText, Hourglass, Inbox, Link2, Loader2, Mail, MapPin, MessageSquare, Phone, Search, Sparkles, Trash2, Users, X } from 'lucide-react';

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

// Same bands the ranking service uses when it writes its rationale
// (api/_ranking/scoring.py), so the label here always agrees with it.
const getMatchVerdict = (score: number) => {
  if (score >= 80) return { label: 'Strong', pill: 'bg-success-tint text-success-ink', ring: 'stroke-success' };
  if (score >= 60) return { label: 'Good', pill: 'bg-ink-wash text-primary-hover', ring: 'stroke-primary' };
  if (score >= 40) return { label: 'Potential', pill: 'bg-amber-tint text-amber-ink', ring: 'stroke-amber-500' };
  return { label: 'Weak', pill: 'bg-parchment-sunken text-slate-600', ring: 'stroke-slate-400' };
};

const getStatusMeta = (status: string) => {
  if (status === 'referred') return { label: 'Referred', className: 'bg-success-tint text-success-ink' };
  if (status === 'shortlisted') return { label: 'Shortlisted', className: 'bg-ink-wash text-primary-hover' };
  return { label: 'Applied', className: 'bg-parchment-sunken text-slate-600' };
};

// The rationale arrives as one string of sentences ("Strong Match (86.20%).
// Matched required skills: … Signals - …"). Show the readable middle
// sentences as a list; the verdict and raw signal numbers are already
// shown by the score ring and bars.
const parseRationale = (rationale: string) =>
  rationale
    .split(/\.\s+(?=[A-Z])/)
    .map((line) => line.trim().replace(/\.$/, ''))
    .filter((line) => line && !/^(Strong|Good|Potential|Weak) Match/i.test(line) && !line.startsWith('Signals'));

const formatDeadline = (dateString: string) =>
  new Date(dateString).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const formatShortDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const AVATAR_TONES = [
  'bg-ink-wash text-primary-hover',
  'bg-success-tint text-success-ink',
  'bg-amber-tint text-amber-ink',
  'bg-danger-tint text-red-700',
  'bg-parchment-sunken text-slate-600',
];

function ApplicantAvatar({ name, url, size }: { name: string; url?: string; size: number }) {
  if (url) {
    return <img src={url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  const tone = AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];
  return (
    <span
      className={`rounded-full flex items-center justify-center font-display font-extrabold shrink-0 ${tone}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function ScoreRing({ score, size }: { score: number; size: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={radius} fill="none" className="stroke-slate-100" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          className={getMatchVerdict(score).ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-ink" style={{ fontSize: Math.round(size * 0.26) }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-bold text-ink">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-parchment-sunken overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MatchPill({ score }: { score?: number | null }) {
  if (typeof score !== 'number') {
    return <span className="shrink-0 whitespace-nowrap rounded-full bg-parchment-sunken px-2.5 py-1 text-[11.5px] font-semibold text-slate-500">Not ranked</span>;
  }
  const verdict = getMatchVerdict(score);
  return (
    <span className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${verdict.pill}`}>
      <Sparkles className="h-3 w-3" />
      {Math.round(score)} · {verdict.label}
    </span>
  );
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
  const isDesktop = useMediaQuery({ minWidth: 1024 });

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
      // A cancelled request (page left, or React's dev double-mount) comes back
      // from Supabase as a plain `{ error }` object rather than a thrown
      // AbortError, so check the signal itself and drop the stale result.
      if (fetchController.signal.aborted) return;
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
      if (fetchController.signal.aborted || err?.name === 'AbortError') return;
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

  const resumeDownloadName = (application: Application, extension: string) =>
    `${application.user_profile?.full_name?.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Resume'}_${new Date().getFullYear()}.${extension}`;

  const getResumeViewUrl = async (application: Application): Promise<{ url: string; local: boolean; extension: string }> => {
    // Older applications stored the PDF directly in the database. Convert that
    // data URL to a browser Blob so it is never interpolated into document HTML.
    if (application.resume_url?.startsWith('data:')) {
      if (!/^data:application\/pdf;base64,/i.test(application.resume_url)) {
        throw new Error('The stored resume is not a PDF.');
      }
      const response = await fetch(application.resume_url);
      if (!response.ok) throw new Error('Unable to read the stored resume.');
      return { url: URL.createObjectURL(await response.blob()), local: true, extension: 'pdf' };
    }

    // The Edge Function checks the current user against the application before
    // signing a private Storage URL. Existing public URLs are handled there.
    const { data, error } = await supabase.functions.invoke('get-application-resume-url', {
      body: { applicationId: application.id },
    });
    if (error || typeof data?.signedUrl !== 'string') {
      throw new Error('The resume is unavailable or you do not have access.');
    }
    const extension = typeof data.extension === 'string' && /^(pdf|doc|docx)$/.test(data.extension)
      ? data.extension
      : 'pdf';
    return { url: data.signedUrl, local: false, extension };
  };

  const handleViewResume = async (application: Application) => {
    const tab = window.open('', '_blank');
    if (!tab) {
      alert('Allow pop-ups to view the resume, or use Download Resume.');
      return;
    }
    tab.opener = null;
    try {
      const resume = await getResumeViewUrl(application);
      tab.location.href = resume.url;
      if (resume.local) window.setTimeout(() => URL.revokeObjectURL(resume.url), 60_000);
    } catch (error) {
      tab.close();
      console.error('Error viewing resume:', error);
      alert(error instanceof Error ? error.message : 'Unable to view resume.');
    }
  };

  const handleDownloadResume = async (application: Application) => {
    try {
      const resume = await getResumeViewUrl(application);
      let downloadUrl = resume.url;
      try {
        if (!resume.local) {
          const response = await fetch(resume.url, { cache: 'no-store' });
          if (!response.ok) throw new Error('Unable to download resume.');
          downloadUrl = URL.createObjectURL(await response.blob());
        }
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = resumeDownloadName(application, resume.extension);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert(error instanceof Error ? error.message : 'Unable to download resume.');
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
      if (diffHours < 1) return 'Applied just now';
      return `Applied ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
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

  // Read the open applicant from the live list so status changes show
  // straight away, and a declined/deleted applicant closes the panel.
  const selected = selectedApplication
    ? applications.find((app) => app.id === selectedApplication.id) ?? null
    : null;

  const isAssignedToMe = (app: Application) =>
    app.assigned_referrer_id === user?.id && app.status === 'pending' && !!app.assignment_expires_at;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner text="Loading applications..." />
      </div>
    );
  }

  const rankedCount = applications.filter((application) => typeof application.ai_score === 'number').length;
  const rankableCount = getValidApplications().length;
  const tabs = [
    { id: 'all', label: 'All', count: statusCounts.all },
    { id: 'top_ranked', label: 'Top matches', count: statusCounts.top_ranked },
    { id: 'shortlisted', label: 'Shortlisted', count: statusCounts.shortlisted },
    { id: 'referred', label: 'Referred', count: statusCounts.referred },
  ];
  const emptyTabCopy: Record<string, string> = {
    top_ranked: 'Update rankings to see your top matches here.',
    shortlisted: 'Applicants you shortlist will show up here.',
    referred: 'Applicants you refer will show up here.',
  };

  const firstNameOf = (app: Application) => (app.user_profile?.full_name || 'This applicant').split(' ')[0];
  const roleOf = (app: Application) =>
    [app.user_profile?.current_position, app.user_profile?.current_company].filter(Boolean).join(' at ');

  const renderStatusBadge = (status: string) => {
    const meta = getStatusMeta(status);
    return (
      <span className={`shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide ${meta.className}`}>
        {meta.label}
      </span>
    );
  };

  const renderPrimaryAction = (app: Application) => {
    const firstName = firstNameOf(app);

    if (isAssignedToMe(app)) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
              onClick={() => handleAcceptAssignment(app.id)}
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Accept &amp; refer
            </button>
            <button
              type="button"
              className="flex-1 h-11 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-danger-tint transition-colors"
              onClick={() => handleRejectAssignment(app.id)}
            >
              Decline
            </button>
          </div>
          <p className="text-[11.5px] text-slate-500">Accepting marks {firstName} as referred and emails them.</p>
        </div>
      );
    }

    const isReferred = app.status === 'referred';
    const label = app.status === 'shortlisted' ? 'Mark as referred' : isReferred ? 'Referred' : 'Shortlist';
    const helper = app.status === 'shortlisted'
      ? `${firstName} will get an email saying you referred them.`
      : isReferred
        ? `You've referred ${firstName}.`
        : '';

    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${isReferred
            ? 'bg-success-tint text-success-ink cursor-default'
            : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          onClick={() => {
            if (app.status === 'shortlisted') {
              handleStatusUpdate(app.id, 'referred');
              return;
            }
            if (app.status !== 'referred') {
              handleStatusUpdate(app.id, 'shortlisted');
            }
          }}
          disabled={isReferred}
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
          {label}
        </button>
        {helper && <p className="text-[11.5px] text-slate-500">{helper}</p>}
      </div>
    );
  };

  const secondaryButtonClass = 'h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:bg-parchment-sunken transition-colors flex items-center justify-center gap-2';

  const renderAssignedBanner = (app: Application) =>
    isAssignedToMe(app) && app.assignment_expires_at ? (
      <div className="flex gap-2.5 rounded-xl bg-amber-tint px-3.5 py-3 text-amber-ink">
        <Hourglass className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="text-[12.5px] flex flex-col gap-0.5">
          <span className="font-bold">Assigned to you — respond by {formatDeadline(app.assignment_expires_at)}</span>
          <span>Thessis picked you to refer this applicant. If you decline, they'll be offered to another referrer.</span>
        </div>
      </div>
    ) : null;

  const renderMatch = (app: Application, ringSize: number) => {
    if (typeof app.ai_score !== 'number') {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 flex items-center gap-3">
          <span className="size-10 shrink-0 rounded-xl bg-ink-wash text-primary flex items-center justify-center">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-ink">Not ranked yet</p>
            <p className="text-xs text-slate-500 mt-0.5">Use Update rankings to score this resume against the job.</p>
          </div>
        </div>
      );
    }

    const verdict = getMatchVerdict(app.ai_score);
    const reasons = app.ai_rationale ? parseRationale(app.ai_rationale) : [];

    return (
      <div className="rounded-2xl border border-slate-200 p-4 md:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4 md:gap-5">
          <ScoreRing score={app.ai_score} size={ringSize} />
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-base font-extrabold text-ink">{verdict.label} match</span>
              <span className="text-[11px] text-slate-500">AI resume match</span>
            </div>
            {typeof app.ai_skill_score === 'number' && <ScoreBar label="Skills fit" value={app.ai_skill_score} />}
            {typeof app.ai_semantic_score === 'number' && <ScoreBar label="Resume relevance" value={app.ai_semantic_score} />}
          </div>
        </div>
        {reasons.length > 0 ? (
          <ul className="rounded-xl bg-parchment px-3.5 py-3 flex flex-col gap-2 text-[12.5px] leading-snug text-slate-600">
            {reasons.map((reason, index) => {
              const isGap = reason.startsWith('Missing') && !/:\s*none$/i.test(reason);
              const isGood = reason.startsWith('Matched') || reason.startsWith('Missing');
              return (
                <li key={index} className="flex gap-2">
                  {isGap ? (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  ) : isGood ? (
                    <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-success" strokeWidth={3} />
                  ) : (
                    <span className="size-1.5 shrink-0 rounded-full bg-slate-400 mt-1.5 mx-1" />
                  )}
                  {reason}
                </li>
              );
            })}
          </ul>
        ) : app.ai_rationale ? (
          <p className="rounded-xl bg-parchment px-3.5 py-3 text-[12.5px] leading-relaxed text-slate-600">{app.ai_rationale}</p>
        ) : null}
      </div>
    );
  };

  const renderExtras = (app: Application) => (
    <>
      {app.cover_letter && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Cover letter</h3>
          <p className="text-[13.5px] leading-relaxed text-slate-600 whitespace-pre-line">{app.cover_letter}</p>
        </section>
      )}
      {(app.user_profile?.phone || app.user_profile?.linkedin_url) && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Contact</h3>
          {app.user_profile?.phone && (
            <span className="flex items-center gap-2 text-[13px] text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{app.user_profile.phone}</span>
          )}
          {app.user_profile?.linkedin_url && (
            <a className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline" href={app.user_profile.linkedin_url} target="_blank" rel="noopener noreferrer">
              <Link2 className="h-4 w-4" />LinkedIn profile
            </a>
          )}
        </section>
      )}
      {app.user_profile?.skills && app.user_profile.skills.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {app.user_profile.skills.map((skill, index) => (
              <span key={index} className="rounded-full bg-parchment-sunken px-2.5 py-1 text-xs font-semibold text-slate-600">{skill}</span>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const renderRemoveButton = (app: Application) => (
    <button
      type="button"
      className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-bold text-red-600 hover:bg-danger-tint transition-colors"
      onClick={() => handleDeleteApplication(app)}
    >
      <Trash2 className="h-4 w-4" />
      {activeTab === 'shortlisted' ? 'Take off shortlist' : 'Remove applicant'}
    </button>
  );

  const renderIdentity = (app: Application, avatarSize: number) => {
    const role = roleOf(app);
    return (
      <div className="flex items-start gap-3.5 md:gap-4">
        <ApplicantAvatar name={app.user_profile?.full_name || 'Unknown'} url={app.user_profile?.avatar_url} size={avatarSize} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-display text-lg md:text-xl font-extrabold text-ink">
              {app.user_id ? (
                <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => app.user_id && onViewProfile(app.user_id)}>
                  {app.user_profile?.full_name || 'Unknown applicant'}
                </button>
              ) : (
                app.user_profile?.full_name || 'Unknown applicant'
              )}
            </h2>
            {renderStatusBadge(app.status)}
          </div>
          {role && <p className="text-[13.5px] text-slate-600">{role}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
            {app.user_profile?.location && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{app.user_profile.location}</span>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(app.created_at || app.applied_at || new Date().toISOString())}</span>
            {app.user_profile?.email && (
              <span className="flex items-center gap-1 break-all"><Mail className="h-3.5 w-3.5 shrink-0" />{app.user_profile.email}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderApplicantRow = (application: Application) => {
    const isSelected = selected?.id === application.id;
    const role = roleOf(application);
    const assigned = isAssignedToMe(application);

    return (
      <div key={application.id} className="flex flex-col gap-2">
        {/* The whole card selects the applicant; the name on top of it opens their profile. */}
        <div
          className={`relative rounded-2xl p-3.5 md:p-4 border transition-colors ${isSelected
            ? 'bg-ink-wash border-primary ring-1 ring-primary'
            : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
        >
          <button
            type="button"
            aria-current={isSelected ? 'true' : undefined}
            aria-label={`Open ${application.user_profile?.full_name || 'applicant'}'s application`}
            onClick={() => setSelectedApplication(application)}
            className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="relative pointer-events-none flex items-start gap-3">
            <ApplicantAvatar name={application.user_profile?.full_name || 'Unknown'} url={application.user_profile?.avatar_url} size={42} />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                {application.user_id ? (
                  <button
                    type="button"
                    className="pointer-events-auto min-w-0 truncate text-left text-[14.5px] font-bold text-ink hover:text-primary hover:underline"
                    onClick={() => application.user_id && onViewProfile(application.user_id)}
                  >
                    {application.user_profile?.full_name || 'Unknown applicant'}
                  </button>
                ) : (
                  <span className="text-[14.5px] font-bold text-ink truncate">{application.user_profile?.full_name || 'Unknown applicant'}</span>
                )}
                {renderStatusBadge(application.status)}
              </div>
              {role && <span className="text-[12.5px] text-slate-600 truncate">{role}</span>}
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="flex items-center gap-2.5 min-w-0 text-[11.5px] text-slate-500 whitespace-nowrap">
                  {application.user_profile?.location && (
                    <span className="hidden sm:flex items-center gap-1 min-w-0"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{application.user_profile.location}</span></span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{formatDate(application.created_at || application.applied_at || new Date().toISOString())}</span>
                </span>
                <MatchPill score={application.ai_score} />
              </div>
            </div>
          </div>
          {assigned && application.assignment_expires_at && (
            <div className="relative pointer-events-none mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-tint px-2.5 py-1.5 text-xs font-bold text-amber-ink">
              <Hourglass className="h-3.5 w-3.5 shrink-0" />
              Assigned to you · respond by {formatShortDate(application.assignment_expires_at)}
            </div>
          )}
        </div>
        {assigned && !isDesktop && (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 h-10 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors"
              onClick={() => handleAcceptAssignment(application.id)}
            >
              Accept &amp; refer
            </button>
            <button
              type="button"
              className="flex-1 h-10 rounded-xl border border-red-200 bg-white text-red-600 text-[13px] font-bold hover:bg-danger-tint transition-colors"
              onClick={() => handleRejectAssignment(application.id)}
            >
              Decline
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderEmptyList = () => {
    if (applications.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-10 flex flex-col items-center gap-2 text-center">
          <span className="size-12 rounded-full bg-parchment-sunken text-slate-400 flex items-center justify-center mb-1"><Inbox className="h-5 w-5" /></span>
          <p className="font-display text-base font-extrabold text-ink">No applicants yet</p>
          <p className="text-[13px] text-slate-500">New applicants for this role will show up here.</p>
        </div>
      );
    }
    if (searchQuery) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-10 flex flex-col items-center gap-2 text-center">
          <span className="size-12 rounded-full bg-parchment-sunken text-slate-400 flex items-center justify-center mb-1"><Search className="h-5 w-5" /></span>
          <p className="font-display text-base font-extrabold text-ink">No one matches “{searchQuery}”</p>
          <p className="text-[13px] text-slate-500">Try a different name, email or company.</p>
          <button type="button" className="mt-1 text-[12.5px] font-bold text-primary hover:underline" onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-10 flex flex-col items-center gap-2 text-center">
        <span className="size-12 rounded-full bg-parchment-sunken text-slate-400 flex items-center justify-center mb-1"><Users className="h-5 w-5" /></span>
        <p className="font-display text-base font-extrabold text-ink">No one here yet</p>
        <p className="text-[13px] text-slate-500">{emptyTabCopy[activeTab] || 'Applicants will show up here.'}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-5 md:py-8 flex flex-col gap-4 md:gap-5">
        <button
          type="button"
          onClick={onBack}
          className="self-start flex items-center gap-1.5 text-[13px] font-bold text-slate-600 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl md:text-[28px] font-extrabold text-ink">{referralTitle}</h1>
          <p className="text-sm text-slate-500">
            <strong className="text-ink">{applications.length} {applications.length === 1 ? 'person' : 'people'}</strong> {applications.length === 1 ? 'has' : 'have'} applied
          </p>
        </header>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-danger-tint px-4 py-3" role="alert">
            <div className="flex gap-2.5 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <div className="text-[12.5px] min-w-0">
                <p className="font-bold text-red-600">Couldn't load applicants</p>
                <p className="text-slate-600 break-words">{error}</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 h-9 px-3.5 rounded-lg border border-red-200 bg-white text-red-600 text-[12.5px] font-bold hover:bg-red-50 transition-colors"
              onClick={() => fetchApplications()}
            >
              Try again
            </button>
          </div>
        )}

        {applications.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5 rounded-2xl border border-indigo-200 bg-white px-4 py-3.5 md:px-5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-10 shrink-0 rounded-xl bg-ink-wash text-primary flex items-center justify-center">
                  <Sparkles className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[14.5px] font-bold text-ink">AI resume match</p>
                  <p className="text-[12.5px] text-slate-500">
                    {aiRankingLoading
                      ? 'Checking each resume against the job description.'
                      : rankedCount > 0
                        ? <><strong className="text-ink">{rankedCount} of {applications.length}</strong> applicants ranked{aiLastUpdatedAt ? ` · updated at ${new Date(aiLastUpdatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}</>
                        : rankableCount === 0
                          ? 'Applicants need a resume on file before they can be ranked.'
                          : "Score each applicant's resume against the job description."}
                  </p>
                </div>
              </div>
              {aiRankingLoading ? (
                <div className="flex items-center gap-3 sm:min-w-[240px]" role="status">
                  <Loader2 className="h-[18px] w-[18px] shrink-0 text-primary animate-spin" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-bold text-primary-hover">Scoring {rankableCount} applicants…</span>
                    <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                      <div className="h-full w-2/5 rounded-full bg-primary animate-indeterminate" />
                    </div>
                  </div>
                </div>
              ) : canRunAiRanking ? (
                <button
                  type="button"
                  onClick={triggerAiRanking}
                  disabled={aiRankingLoading}
                  className="shrink-0 h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {rankedCount > 0 ? 'Update rankings' : 'Rank applicants'}
                </button>
              ) : null}
            </div>

            {aiRankingFailures.length > 0 ? (
              <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-tint px-4 py-3 text-amber-ink" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-[12.5px] flex flex-col gap-1">
                  <p className="font-bold">{aiRankingError || 'Some applicants could not be scored.'}</p>
                  <ul className="flex flex-col gap-0.5">
                    {aiRankingFailures.map((failure, index) => (
                      <li key={index}><strong>{failure.name}</strong> — {failure.reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : aiRankingError ? (
              <div className="flex gap-2.5 rounded-xl border border-red-200 bg-danger-tint px-4 py-3" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <div className="text-[12.5px]">
                  <p className="font-bold text-red-600">Couldn't rank applicants</p>
                  <p className="text-slate-600 break-words">{aiRankingError}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-2 h-9 md:h-10 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${isActive
                    ? 'bg-ink border-ink text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  {tab.id === 'top_ranked' && <Sparkles className="h-3.5 w-3.5" />}
                  {tab.label}
                  <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-parchment-sunken text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-72 lg:flex-none">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                aria-label="Search applicants"
                placeholder="Search name, email or company"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <button
              type="button"
              className="shrink-0 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:border-slate-300 transition-colors flex items-center gap-2"
              onClick={() => setSortOrder((prev) => (prev === 'earliest' ? 'latest' : 'earliest'))}
              title="Change sort order"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">{sortOrder === 'earliest' ? 'Oldest first' : 'Newest first'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="w-full lg:w-[420px] xl:w-[500px] shrink-0 flex flex-col gap-2.5">
            {sortedApplications.length === 0 ? renderEmptyList() : sortedApplications.map(renderApplicantRow)}
          </div>

          {isDesktop && (
            <div className="flex-1 min-w-0 w-full lg:sticky lg:top-24">
              {selected ? (
                <div className="bg-white border border-slate-200 rounded-2xl flex flex-col lg:max-h-[calc(100vh-7.5rem)] overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    {renderIdentity(selected, 56)}
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                    {renderAssignedBanner(selected)}
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex-1 min-w-[220px]">{renderPrimaryAction(selected)}</div>
                      <button type="button" className={secondaryButtonClass} onClick={() => onMessage(selected.applicant_id)}>
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </button>
                      <button type="button" className={secondaryButtonClass} onClick={() => handleViewResume(selected)}>
                        <FileText className="h-4 w-4" />
                        View resume
                      </button>
                      <button
                        type="button"
                        aria-label="Download resume"
                        title="Download resume"
                        className={`${secondaryButtonClass} !px-0 w-11`}
                        onClick={() => handleDownloadResume(selected)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                    {renderMatch(selected, 84)}
                    {renderExtras(selected)}
                  </div>
                  <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
                    {renderRemoveButton(selected)}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-[1.5px] border-dashed border-slate-300 bg-white px-6 py-14 flex flex-col items-center gap-2 text-center">
                  <span className="size-12 rounded-full bg-ink-wash text-primary flex items-center justify-center mb-1"><Users className="h-5 w-5" /></span>
                  <p className="font-display text-base font-extrabold text-ink">Pick an applicant</p>
                  <p className="text-[13px] text-slate-500 max-w-xs">Their resume match, cover letter and actions will show here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Applicant details — full screen on phones, a dialog on tablets */}
      {!isDesktop && selected && (
        <div
          className="fixed inset-0 z-[60] flex md:items-center md:justify-center md:p-6 bg-ink/45"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.user_profile?.full_name || 'Applicant'}
            className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
              <span className="font-display text-[15px] font-extrabold text-ink">Applicant</span>
              <button
                type="button"
                aria-label="Close"
                className="size-9 rounded-full bg-parchment-sunken text-ink flex items-center justify-center hover:bg-slate-200 transition-colors"
                onClick={() => setSelectedApplication(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
              {renderIdentity(selected, 52)}
              {renderAssignedBanner(selected)}
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className={`${secondaryButtonClass} !h-10 !px-2 text-[12.5px]`} onClick={() => handleViewResume(selected)}>
                  <FileText className="h-4 w-4" />
                  Resume
                </button>
                <button type="button" className={`${secondaryButtonClass} !h-10 !px-2 text-[12.5px]`} onClick={() => handleDownloadResume(selected)}>
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button type="button" className={`${secondaryButtonClass} !h-10 !px-2 text-[12.5px]`} onClick={() => onMessage(selected.applicant_id)}>
                  <MessageSquare className="h-4 w-4" />
                  Message
                </button>
              </div>
              {renderMatch(selected, 68)}
              {renderExtras(selected)}
              <div className="self-start">{renderRemoveButton(selected)}</div>
            </div>
            <div className="shrink-0 border-t border-slate-100 px-4 pt-3 pb-5 md:px-6 md:pb-4">
              {renderPrimaryAction(selected)}
            </div>
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      {applicationToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/45"
            onClick={() => !isDeleting && setApplicationToDelete(null)}
          ></div>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-applicant-title"
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center gap-3">
              <span className="size-14 rounded-full bg-danger-tint text-red-600 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </span>
              <h3 id="remove-applicant-title" className="font-display text-lg font-extrabold text-ink">
                {removalMode === 'unshortlist'
                  ? `Take ${firstNameOf(applicationToDelete)} off your shortlist?`
                  : `Delete ${firstNameOf(applicationToDelete)}'s application?`}
              </h3>
              <p className="text-[13.5px] text-slate-500 leading-relaxed">
                {removalMode === 'unshortlist' ? (
                  <><strong className="text-ink">{applicationToDelete.user_profile?.full_name}</strong> will move back to Applied. Their application stays.</>
                ) : (
                  <><strong className="text-ink">{applicationToDelete.user_profile?.full_name}</strong>'s application will be permanently deleted. This can't be undone.</>
                )}
              </p>
            </div>
            <div className="flex gap-2.5 px-5 py-4 border-t border-slate-100 bg-parchment">
              <button
                type="button"
                autoFocus
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-parchment-sunken transition-colors disabled:opacity-50"
                onClick={() => setApplicationToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : removalMode === 'unshortlist' ? (
                  'Remove from shortlist'
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
