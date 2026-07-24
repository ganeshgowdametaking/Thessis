import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import BackArrowIcon from './icons/BackArrowIcon';
import { applicationService } from '../services/applicationService';
import { useMediaQuery } from 'react-responsive';

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

interface AIRankingCandidate {
  id: number;
  name: string;
  email: string;
  score: number | null;
  rationale: string | null;
  shortlisted: boolean;
  shortlist_reason: string | null;
  status: string;
}

interface AIRankingLeaderboard {
  job: {
    id: number;
    title: string;
  };
  top_5: AIRankingCandidate[];
  others: AIRankingCandidate[];
  total_ranked: number;
  shortlisted_count?: number;
  pending_count: number;
  failed_count: number;
}

export default function ApplicationsPage({
  referralId,
  referralTitle,
  onBack,
  onMessage,
  onViewProfile
}: ApplicationsPageProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'earliest' | 'latest'>('earliest');
  const [aiRankingLoading, setAiRankingLoading] = useState(false);
  const [aiRankingError, setAiRankingError] = useState<string | null>(null);
  const [aiLeaderboard, setAiLeaderboard] = useState<AIRankingLeaderboard | null>(null);
  const [aiLastUpdatedAt, setAiLastUpdatedAt] = useState<string | null>(null);
  const [aiLastRunKey, setAiLastRunKey] = useState<string>('');
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removalMode, setRemovalMode] = useState<'delete' | 'unshortlist'>('delete');
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [isAiPanelExpanded, setIsAiPanelExpanded] = useState(false);

  const configuredRankingApi = (import.meta.env.VITE_RESUME_RANKING_API || '/api/ranking').trim();
  const resumeRankingApiBase = configuredRankingApi.replace(/\/+$/, '');

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(controller);
    return () => controller.abort();
  }, [referralId]);

  const fetchApplications = async (controller?: AbortController) => {
    const fetchController = controller || new AbortController();
    try {
      setLoading(true);
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
          rating,
          shortlisted,
          notes,
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
      setError(err instanceof Error ? err.message : 'Failed to load applications');
      setApplications([]);
    } finally {
      if (!fetchController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const extractJobDescriptionFromRecord = (record: Record<string, unknown> | null): string => {
    if (!record) {
      return '';
    }

    const candidates = [
      record.description,
      record.job_description,
      record.requirements,
      record.responsibilities,
      record.summary,
    ];

    for (const entry of candidates) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return entry.trim();
      }
    }

    return '';
  };

  const fallbackJobDescription = () =>
    [
      `Job Title: ${referralTitle}`,
      'Please evaluate candidates for this role using the resume and profile details.',
      'Prioritize role-fit, required skills, and relevant years of experience.',
    ].join('\n');

  const buildProfileText = (application: Application) => {
    const profile = application.user_profile;
    const chunks = [
      profile?.current_position,
      profile?.current_company,
      profile?.location,
      Array.isArray(profile?.skills) ? profile?.skills.join(', ') : '',
      profile?.linkedin_url,
    ].filter((value) => typeof value === 'string' && value.trim().length > 0) as string[];

    return chunks.join('\n');
  };

  const resumeUrlToPdfFile = async (resumeUrl: string, fileStem: string): Promise<File> => {
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Resume fetch failed (${response.status})`);
    }

    const blob = await response.blob();
    const safeName = fileStem.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    return new File([blob], `${safeName || 'resume'}.pdf`, { type: blob.type || 'application/pdf' });
  };

  const fetchRankingLeaderboard = async (jobId: number): Promise<AIRankingLeaderboard> => {
    const res = await fetch(`${resumeRankingApiBase}/jobs/${jobId}/leaderboard`);
    if (!res.ok) {
      throw new Error(`Failed to fetch leaderboard (${res.status})`);
    }
    return (await res.json()) as AIRankingLeaderboard;
  };

  const getValidApplications = () =>
    applications.filter((application) => {
      // We no longer check resume_url here as it's fetched on-demand to save payload
      const hasEmail = Boolean(application.user_profile?.email);
      const hasName = Boolean(application.user_profile?.full_name);
      return hasEmail && hasName;
    });

  const buildAiRunKey = () => {
    const serial = getValidApplications()
      .map((application) => `${application.id}:${application.updated_at || application.applied_at || (application as any).created_at || ''}`)
      .sort()
      .join('|');
    return `${referralId}|${serial}`;
  };

  const handleRunAiRanking = async () => {
    try {
      setAiRankingLoading(true);
      setAiRankingError(null);

      if (!resumeRankingApiBase) {
        setAiRankingError('AI ranking service is not configured. Set VITE_RESUME_RANKING_API to your deployed ranking API URL.');
        return;
      }

      const validApplications = getValidApplications();

      if (validApplications.length === 0) {
        setAiRankingError('No applicants with complete profile/email/resume data were found.');
        return;
      }

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', referralId)
        .maybeSingle();

      if (jobError) {
        console.warn('Could not fetch full job description from jobs table:', jobError.message);
      }

      const jobRecord = (jobData as Record<string, unknown> | null) || null;
      const jdText = extractJobDescriptionFromRecord(jobRecord) || fallbackJobDescription();

      const createJobForm = new FormData();
      createJobForm.append('title', referralTitle);
      createJobForm.append('description', jdText);

      const createJobRes = await fetch(`${resumeRankingApiBase}/jobs/`, {
        method: 'POST',
        body: createJobForm,
      });

      if (!createJobRes.ok) {
        const errorBody = await createJobRes.text().catch(() => '');
        throw new Error(`Ranking service unavailable (${createJobRes.status})${errorBody ? `: ${errorBody}` : ''}`);
      }

      const createdJob = (await createJobRes.json()) as { id: number };
      const rankingJobId = createdJob.id;

      // Submit all applications in parallel
      const submissionPromises = validApplications.map(async (application) => {
        try {
          // Fetch resume_url on demand if not present
          let currentResumeUrl = (application as any).resume_url;
          if (!currentResumeUrl) {
            const { data: appData, error: appError } = await (supabase
              .from('applications') as any)
              .select('resume_url')
              .eq('id', application.id)
              .single();

            if (appError || !(appData as any)?.resume_url) {
              console.warn(`Could not fetch resume for application ${application.id}:`, appError);
              return false;
            }
            currentResumeUrl = (appData as any).resume_url;
          }

          const fullName = application.user_profile?.full_name || 'Unknown';
          const email = application.user_profile?.email || '';
          const phone = (application.user_profile as any)?.phone || '';
          const profileText = buildProfileText(application);
          const file = await resumeUrlToPdfFile(currentResumeUrl as string, fullName);

          const appForm = new FormData();
          appForm.append('name', fullName);
          appForm.append('email', email);
          appForm.append('phone', phone);
          appForm.append('profile_text', profileText);
          appForm.append('file', file);

          const submitRes = await fetch(`${resumeRankingApiBase}/jobs/${rankingJobId}/applications/`, {
            method: 'POST',
            body: appForm,
          });

          if (submitRes.ok) {
            return true;
          }
        } catch (submissionError) {
          console.warn('Skipping applicant for AI ranking due to upload error:', submissionError);
        }
        return false;
      });

      const results = await Promise.all(submissionPromises);
      const submitted = results.filter(Boolean).length;

      if (submitted === 0) {
        throw new Error('Could not submit any applicant resumes to the ranking service.');
      }

      const timeoutMs = 240000;
      const pollIntervalMs = 2500;
      const start = Date.now();
      let latestBoard: AIRankingLeaderboard | null = null;

      while (Date.now() - start < timeoutMs) {
        latestBoard = await fetchRankingLeaderboard(rankingJobId);
        if (latestBoard.pending_count === 0) {
          break;
        }
        await pause(pollIntervalMs);
      }

      if (!latestBoard) {
        throw new Error('Ranking service did not return a leaderboard.');
      }

      setAiLeaderboard(latestBoard);
      setAiLastUpdatedAt(new Date().toISOString());
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

    // Primary source: AI leaderboard mapping by applicant email.
    if (aiLeaderboard) {
      const leaderboardCandidates = [
        ...(aiLeaderboard.top_5 || []),
        ...(aiLeaderboard.others || []),
      ]
        .filter((candidate) => typeof candidate?.score === 'number')
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);

      const rankedEmailSet = new Set(
        leaderboardCandidates
          .map((candidate) => candidate.email?.toLowerCase?.().trim?.())
          .filter((email) => Boolean(email))
      );

      const leaderboardMapped = applications.filter((application) => {
        const applicantEmail = application.user_profile?.email?.toLowerCase?.().trim?.();
        return applicantEmail ? rankedEmailSet.has(applicantEmail) : false;
      });

      if (leaderboardMapped.length > 0) {
        return leaderboardMapped;
      }
    }

    // Fallback source: existing rating field if available.
    return [...applications]
      .filter((application) => typeof application.rating === 'number')
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }, [applications, aiLeaderboard]);

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
  const showAiPanelDetails = !isMobile || isAiPanelExpanded;

  if (loading) {
    return <LoadingSpinner text="Loading applications..." />;
  }

  return (
    <div className="min-h-screen bg-parchment flex flex-col overflow-hidden">
      {/* Page Header */}
      <header className="bg-parchment pt-5 md:pt-8 pb-3 md:pb-4 px-4 md:px-8 shrink-0 z-10">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          <div
            className="hidden md:flex items-center gap-2 text-slate-500 hover:text-ink transition-colors cursor-pointer w-fit"
            onClick={onBack}
          >
            <BackArrowIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Referrals</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Applications</h1>
                <span className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-slate-500 font-medium">
                {referralTitle} • <span className="text-ink font-semibold">{applications.length} Total Applicants</span>
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
                className={`flex items-center gap-2 pb-3 border-b-2 px-1 ${activeTab === 'top_ranked'
                  ? 'border-[#4353FF] text-ink'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('top_ranked')}
              >
                <span className="font-bold text-sm whitespace-nowrap">Top applicants</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'top_ranked'
                  ? 'bg-ink text-white'
                  : 'bg-parchment-sunken text-slate-600'
                  }`}>
                  {statusCounts.top_ranked}
                </span>
              </button>

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
              <div className="relative w-full lg:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg border-none bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-[#4353FF] shadow-sm"
                  placeholder="Search applicants..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="h-6 w-px bg-parchment-sunken mx-1"></div>
              <button
                className="h-10 px-4 rounded-lg bg-white border border-transparent hover:border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all whitespace-nowrap"
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
                <h2 className="text-lg font-bold text-slate-900">AI Resume Ranking</h2>
                <p className="text-sm text-slate-500">
                  Automatically ranks applicants when new applications are detected and updates shortlist insights.
                </p>
                {aiLastUpdatedAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last updated: {new Date(aiLastUpdatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${aiRankingLoading ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {aiRankingLoading ? 'AI Ranking In Progress' : 'Auto Ranking Enabled'}
                </span>
                {canRunAiRanking && (
                  <button
                    onClick={triggerAiRanking}
                    disabled={aiRankingLoading}
                    className="h-9 px-4 rounded-lg bg-ink text-white text-xs font-bold hover:bg-ink-deep transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    Update AI Rankings
                  </button>
                )}
              </div>
            </div>

            {isMobile && (
              <button
                className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
                onClick={() => setIsAiPanelExpanded((prev) => !prev)}
              >
                <span className="material-symbols-outlined text-[16px]">{isAiPanelExpanded ? 'expand_less' : 'expand_more'}</span>
                {isAiPanelExpanded ? 'Collapse AI Details' : 'Expand AI Details'}
              </button>
            )}

            {showAiPanelDetails && aiRankingError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
                {aiRankingError}
              </div>
            )}

            {showAiPanelDetails && aiLeaderboard && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-parchment-sunken rounded-lg p-3">
                    <p className="text-xs text-slate-500">Shortlisted</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.shortlisted_count ?? aiLeaderboard.top_5.length}</p>
                  </div>
                  <div className="bg-parchment-sunken rounded-lg p-3">
                    <p className="text-xs text-slate-500">Ranked</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.total_ranked}</p>
                  </div>
                  <div className="bg-parchment-sunken rounded-lg p-3">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.pending_count}</p>
                  </div>
                  <div className="bg-parchment-sunken rounded-lg p-3">
                    <p className="text-xs text-slate-500">Failed</p>
                    <p className="text-lg font-bold text-slate-900">{(aiLeaderboard as any).failed_count}</p>
                  </div>
                </div>

                {(aiLeaderboard.top_5.length > 0 || aiLeaderboard.others.length > 0) ? (
                  <div className="bg-parchment rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-200">
                      <p className="text-sm font-semibold text-slate-700">
                        {aiLeaderboard.top_5.length > 0
                          ? `Top Qualified Candidates (${aiLeaderboard.top_5.length} found)`
                          : `Top Ranked Candidates (${Math.min(aiLeaderboard.others.length, 5)} shown)`}
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {(aiLeaderboard.top_5.length > 0 ? aiLeaderboard.top_5 : aiLeaderboard.others.slice(0, 5)).map((candidate, index) => (
                        <div key={candidate.id} className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {index + 1}. {candidate.name} <span className="text-ink">({(candidate.score ?? 0).toFixed(2)}%)</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{candidate.rationale || 'No rationale provided.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No candidates met shortlist thresholds for this job yet.
                  </div>
                )}
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
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 md:gap-5">
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
                      <div className="h-12 w-12 rounded-full bg-cover bg-center bg-parchment-sunken flex items-center justify-center">
                        {application.user_profile?.avatar_url ? (
                          <img
                            src={application.user_profile.avatar_url}
                            alt={application.user_profile.full_name || 'User'}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-500 font-medium text-lg">
                            {application.user_profile?.full_name?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {application.user_profile?.full_name || 'Unknown User'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {application.user_profile?.current_position || 'No position listed'}
                        </p>
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
                      <span className="material-symbols-outlined text-[16px]">apartment</span>
                      <span>{application.user_profile?.current_company || 'No company'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>{application.user_profile?.location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span>{formatDate(application.created_at || (application as any).applied_at || new Date().toISOString())}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1 pt-2 border-t border-slate-100">
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      <span className="truncate">{application.user_profile?.email || 'No email'}</span>
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
                    <button
                      className={`w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${application.status === 'referred'
                        ? 'bg-parchment-sunken text-slate-700 cursor-default'
                        : 'bg-ink hover:bg-ink-deep text-white'
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        className="bg-white border border-slate-200 hover:bg-parchment-sunken text-slate-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        View Details
                      </button>
                      <button
                        className="bg-white border border-slate-200 hover:bg-parchment-sunken text-slate-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        onClick={() => handleViewResume(application)}
                      >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        Resume
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
          <div className={`bg-white w-full shadow-2xl flex flex-col overflow-hidden ${isMobile ? 'h-[92vh] rounded-t-2xl rounded-b-none' : 'max-w-3xl max-h-[90vh] rounded-xl'}`}>
            <div className={`flex items-center justify-between border-b border-slate-100 shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center gap-4">
                <div className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} rounded-full bg-cover bg-center bg-parchment-sunken flex items-center justify-center`}>
                  {selectedApplication.user_profile?.avatar_url ? (
                    <img
                      src={selectedApplication.user_profile.avatar_url}
                      alt={selectedApplication.user_profile.full_name || 'User'}
                      className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} rounded-full object-cover`}
                    />
                  ) : (
                    <span className={`${isMobile ? 'text-lg' : 'text-2xl'} text-slate-500 font-medium`}>
                      {selectedApplication.user_profile?.full_name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-slate-900`}>
                    {selectedApplication.user_profile?.full_name || 'Unknown User'}
                  </h2>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
                    {selectedApplication.user_profile?.current_position} at {selectedApplication.user_profile?.current_company}
                  </p>
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
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Cover Letter</h3>
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
              <button
                className={`${isMobile ? 'w-full justify-center' : ''} px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${selectedApplication.status === 'referred'
                  ? 'bg-parchment-sunken text-slate-700 cursor-default'
                  : 'bg-ink text-white hover:bg-ink-deep'
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
