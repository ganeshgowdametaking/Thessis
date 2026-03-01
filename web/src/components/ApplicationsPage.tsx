import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import BackArrowIcon from './icons/BackArrowIcon';

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
  const [aiRankingLoading, setAiRankingLoading] = useState(false);
  const [aiRankingError, setAiRankingError] = useState<string | null>(null);
  const [aiLeaderboard, setAiLeaderboard] = useState<AIRankingLeaderboard | null>(null);
  const [aiLastUpdatedAt, setAiLastUpdatedAt] = useState<string | null>(null);
  const [aiLastRunKey, setAiLastRunKey] = useState<string>('');

  const configuredRankingApi = (import.meta.env.VITE_RESUME_RANKING_API || '/api/ranking').trim();
  const resumeRankingApiBase = configuredRankingApi.replace(/\/+$/, '');

  useEffect(() => {
    fetchApplications();
  }, [referralId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
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
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        setError('Failed to load applications');
        setApplications([]);
      } else {
        // Map the data to match the expected interface
        const mappedData = (data || []).map(app => ({
          ...app,
          user_id: app.applicant_id,
          created_at: app.applied_at,
          user_profile: app.user_profile ? {
            ...app.user_profile,
            current_company: app.user_profile.company,
            current_position: app.user_profile.title
          } : null
        }));
        setApplications(mappedData);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
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
      const hasResume = Boolean(application.resume_url);
      const hasEmail = Boolean(application.user_profile?.email);
      const hasName = Boolean(application.user_profile?.full_name);
      return hasResume && hasEmail && hasName;
    });

  const buildAiRunKey = () => {
    const serial = getValidApplications()
      .map((application) => `${application.id}:${application.updated_at || application.applied_at || ''}:${application.resume_url || ''}`)
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

      let submitted = 0;
      for (const application of validApplications) {
        try {
          const fullName = application.user_profile?.full_name || 'Unknown';
          const email = application.user_profile?.email || '';
          const phone = application.user_profile?.phone || '';
          const profileText = buildProfileText(application);
          const file = await resumeUrlToPdfFile(application.resume_url || '', fullName);

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
            submitted += 1;
          }
        } catch (submissionError) {
          console.warn('Skipping applicant for AI ranking due to upload error:', submissionError);
        }
      }

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

  useEffect(() => {
    if (loading || aiRankingLoading) {
      return;
    }

    const runKey = buildAiRunKey();
    if (!runKey || runKey === aiLastRunKey) {
      return;
    }

    const validCount = getValidApplications().length;
    if (validCount === 0) {
      return;
    }

    setAiLastRunKey(runKey);
    void handleRunAiRanking();
  }, [applications, referralId, loading, aiRankingLoading]);

  const handleViewResume = (application: Application) => {
    if (!application.resume_url) {
      alert('No resume available for this application.');
      return;
    }

    try {
      // If it's a base64 data URL, open it in a new tab
      if (application.resume_url.startsWith('data:')) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>Resume - ${application.user_profile?.full_name}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f5f5f5;">
                <embed src="${application.resume_url}" width="100%" height="100%" type="application/pdf" />
              </body>
            </html>
          `);
        }
      } else {
        // If it's a URL, open it directly
        window.open(application.resume_url, '_blank');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      alert('Unable to view resume. Please try downloading instead.');
    }
  };

  const handleDownloadResume = (application: Application) => {
    if (!application.resume_url) {
      alert('No resume available for this application.');
      return;
    }

    try {
      const fileName = `${application.user_profile?.full_name?.replace(/\s+/g, '_') || 'Resume'}_${new Date().getFullYear()}.pdf`;

      if (application.resume_url.startsWith('data:')) {
        // Handle base64 data
        const link = document.createElement('a');
        link.href = application.resume_url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Handle URL
        const link = document.createElement('a');
        link.href = application.resume_url;
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
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status: newStatus }
            : app
        )
      );
    } catch (error) {
      console.error('Error updating application status:', error);
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

  const filteredApplications = applications.filter(app => {
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    const matchesSearch = !searchQuery ||
      app.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_profile?.current_company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getStatusCounts = () => {
    const counts = {
      all: applications.length,
      pending: applications.filter(app => app.status === 'pending').length,
      shortlisted: applications.filter(app => app.status === 'shortlisted').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return <LoadingSpinner text="Loading applications..." />;
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col overflow-hidden">
      {/* Page Header */}
      <header className="bg-[#F9F9F7] pt-8 pb-4 px-8 shrink-0 z-10">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          <div
            className="flex items-center gap-2 text-slate-500 hover:text-[#5f7261] transition-colors cursor-pointer w-fit"
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
                {referralTitle} • <span className="text-[#5f7261] font-semibold">{applications.length} Total Applicants</span>
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
                  ? 'border-[#5f7261] text-[#5f7261]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('all')}
              >
                <span className="font-bold text-sm">All</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'all'
                  ? 'bg-[#5f7261] text-white'
                  : 'bg-slate-200 text-slate-600'
                  }`}>
                  {statusCounts.all}
                </span>
              </button>

              <button
                className={`flex items-center gap-2 pb-3 border-b-2 px-1 ${activeTab === 'pending'
                  ? 'border-[#5f7261] text-[#5f7261]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('pending')}
              >
                <span className="font-medium text-sm">Pending</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'pending'
                  ? 'bg-[#5f7261] text-white'
                  : 'bg-slate-200 text-slate-600'
                  }`}>
                  {statusCounts.pending}
                </span>
              </button>

              <button
                className={`flex items-center gap-2 pb-3 border-b-2 px-1 ${activeTab === 'shortlisted'
                  ? 'border-[#5f7261] text-[#5f7261]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } transition-all`}
                onClick={() => setActiveTab('shortlisted')}
              >
                <span className="font-medium text-sm">Shortlisted</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'shortlisted'
                  ? 'bg-[#5f7261] text-white'
                  : 'bg-slate-200 text-slate-600'
                  }`}>
                  {statusCounts.shortlisted}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 pb-2 w-full lg:w-auto">
              <div className="relative w-full lg:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg border-none bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-[#5f7261] shadow-sm"
                  placeholder="Search applicants..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <button className="h-10 px-4 rounded-lg bg-white border border-transparent hover:border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all whitespace-nowrap">
                <span className="material-symbols-outlined text-[20px]">sort</span>
                Earliest First
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Applications Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
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
              <div className="w-full lg:w-auto">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${aiRankingLoading ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {aiRankingLoading ? 'AI Ranking In Progress' : 'Auto Ranking Enabled'}
                </span>
              </div>
            </div>

            {aiRankingError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                {aiRankingError}
              </div>
            )}

            {aiLeaderboard && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#f2f1ec] rounded-md p-3">
                    <p className="text-xs text-slate-500">Shortlisted</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.shortlisted_count ?? aiLeaderboard.top_5.length}</p>
                  </div>
                  <div className="bg-[#f2f1ec] rounded-md p-3">
                    <p className="text-xs text-slate-500">Ranked</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.total_ranked}</p>
                  </div>
                  <div className="bg-[#f2f1ec] rounded-md p-3">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.pending_count}</p>
                  </div>
                  <div className="bg-[#f2f1ec] rounded-md p-3">
                    <p className="text-xs text-slate-500">Failed</p>
                    <p className="text-lg font-bold text-slate-900">{aiLeaderboard.failed_count}</p>
                  </div>
                </div>

                {(aiLeaderboard.top_5.length > 0 || aiLeaderboard.others.length > 0) ? (
                  <div className="bg-[#f9f9f7] rounded-md border border-slate-200 overflow-hidden">
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
                            {index + 1}. {candidate.name} <span className="text-[#5f7261]">({(candidate.score ?? 0).toFixed(2)}%)</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{candidate.rationale || 'No rationale provided.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    No candidates met shortlist thresholds for this job yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">
                {searchQuery ? 'No applicants match your search' : 'No applications yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-white rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow border border-slate-100 flex flex-col h-full group relative"
                >
                  {/* Profile Header */}
                  <div className="flex justify-between items-start mb-4">
                    <button
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      onClick={() => onViewProfile(application.user_id)}
                    >
                      <div className="h-12 w-12 rounded-full bg-cover bg-center bg-slate-200 flex items-center justify-center">
                        {application.user_profile?.avatar_url ? (
                          <img
                            src={application.user_profile.avatar_url}
                            alt={application.user_profile.full_name}
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
                    <button className="text-slate-300 hover:text-red-500 transition-colors p-1">
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
                      <span>{formatDate(application.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1 pt-2 border-t border-slate-100">
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      <span className="truncate">{application.user_profile?.email || 'No email'}</span>
                    </div>
                  </div>

                  {/* Cover Letter Preview */}
                  {application.cover_letter && (
                    <div className="mb-5 bg-[#f2f1ec] p-3 rounded-md">
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed italic">
                        "{application.cover_letter}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex flex-col gap-2">
                    <button
                      className="w-full bg-[#5f7261] hover:bg-[#4b5c4d] text-white py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      onClick={() => handleStatusUpdate(application.id, 'shortlisted')}
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Shortlist
                    </button>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-white border border-slate-200 hover:bg-[#f2f1ec] text-slate-700 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        View Details
                      </button>
                      <button
                        className="flex-1 bg-white border border-slate-200 hover:bg-[#f2f1ec] text-slate-700 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        onClick={() => handleViewResume(application)}
                      >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        Resume
                      </button>
                      <button
                        className="flex-1 bg-white border border-slate-200 hover:bg-[#f2f1ec] text-slate-700 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-cover bg-center bg-slate-200 flex items-center justify-center">
                  {selectedApplication.user_profile?.avatar_url ? (
                    <img
                      src={selectedApplication.user_profile.avatar_url}
                      alt={selectedApplication.user_profile.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-500 font-medium text-2xl">
                      {selectedApplication.user_profile?.full_name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedApplication.user_profile?.full_name || 'Unknown User'}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {selectedApplication.user_profile?.current_position} at {selectedApplication.user_profile?.current_company}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-slate-400 hover:bg-[#f2f1ec] rounded-lg transition-colors"
                  onClick={() => setSelectedApplication(null)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-1 flex flex-col gap-6 border-r border-slate-100 pr-8">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-slate-600 text-sm">
                        <span className="material-symbols-outlined text-[#5f7261]">mail</span>
                        <span>{selectedApplication.user_profile?.email}</span>
                      </div>
                      {selectedApplication.user_profile?.phone && (
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                          <span className="material-symbols-outlined text-[#5f7261]">phone</span>
                          <span>{selectedApplication.user_profile.phone}</span>
                        </div>
                      )}
                      {selectedApplication.user_profile?.linkedin_url && (
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                          <span className="material-symbols-outlined text-[#5f7261]">link</span>
                          <a className="text-[#5f7261] hover:underline" href={selectedApplication.user_profile.linkedin_url} target="_blank" rel="noopener noreferrer">
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
                          <span key={index} className="bg-[#f2f1ec] text-slate-600 text-xs px-2 py-1 rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-2 flex flex-col gap-8">
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

            <div className="p-4 border-t border-slate-100 bg-[#f2f1ec]/50 flex justify-end gap-3 shrink-0">
              <button
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white transition-colors"
                onClick={() => setSelectedApplication(null)}
              >
                Dismiss
              </button>
              <button
                className="px-5 py-2.5 rounded-lg bg-[#5f7261] text-white text-sm font-semibold hover:bg-[#4b5c4d] transition-colors flex items-center gap-2"
                onClick={() => {
                  handleStatusUpdate(selectedApplication.id, 'shortlisted');
                  setSelectedApplication(null);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Shortlist Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
