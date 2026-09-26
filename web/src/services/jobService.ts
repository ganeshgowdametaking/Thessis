import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];
// Removed unused ApplicationInsert type

// Simple in-memory cache
let cachedJobs: Job[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 2000; // 2 seconds

export const jobService = {
  // Get all jobs with retry logic and caching
  getJobs: async (filters?: {
    location?: string;
    jobType?: string;
    remote?: boolean;
  }, retries: number = 2): Promise<Job[]> => {
    const now = Date.now();

    // Return cached data if available and fresh, AND no specific filters are applied
    // (Filtering is done client-side usually, but here we pass filters to DB. 
    // If we have powerful filters, we might skip cache. For now, assuming base fetch.)
    const hasFilters = filters && (filters.location || filters.jobType || filters.remote);

    if (!hasFilters && cachedJobs && (now - lastFetchTime < CACHE_DURATION)) {
      console.log('⚡ Returning cached jobs to prevent spam');
      return cachedJobs;
    }

    console.log('🔍 Starting getJobs with filters:', filters);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt + 1} - Executing query...`);

        // Get current user to exclude their own jobs
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        let query = supabase
          .from('referral_listings' as any)
          .select('*')
          .eq('status', 'active' as any)
          .order('created_at', { ascending: false });

        // Exclude jobs created by the current user
        if (currentUserId) {
          query = query.eq('is_owner', false);
        }

        // FIX: Only apply filters if they have a non-empty value
        if (filters?.location && filters.location.trim() !== '') {
          query = query.ilike('location', `%${filters.location.trim()}%`);
        }

        if (filters?.jobType && filters.jobType.trim() !== '') {
          query = query.eq('job_type', filters.jobType as any);
        }

        // Only filter for remote jobs if the remote filter is explicitly set to true
        if (filters?.remote === true) {
          query = query.eq('remote_available', true);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Attempt ${attempt + 1} - Error fetching jobs from Supabase:`, error.message, error.details);
          if (attempt === retries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }

        const result = (data as any[]) || [];

        // Update cache only if successful
        if (!hasFilters) {
          cachedJobs = result;
          lastFetchTime = Date.now();
        }

        console.log(`Attempt ${attempt + 1} - Fetched jobs:`, result.length);
        return result;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} - Unexpected error in getJobs:`, error);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    throw new Error('Failed to fetch jobs after all retries');
  },

  // The listing projection never includes an employee identifier or contact email.
  getJob: async (id: string) => {
    const { data, error } = await supabase.from('referral_listings' as any).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // Create job
  createJob: async (job: Omit<JobInsert, 'created_by'>) => {
    try {
      console.log('🔄 Creating job with data:', job);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ User not authenticated');
        throw new Error('You must be logged in to create a referral');
      }

      console.log('✅ User authenticated:', user.id);

      if (!job.title || !job.company || !job.location || !job.description) {
        console.error('❌ Missing required fields:', {
          title: !!job.title,
          company: !!job.company,
          location: !!job.location,
          description: !!job.description
        });
        throw new Error('Please fill in all required fields: title, company, location, and description');
      }

      const jobData: JobInsert = {
        title: job.title.trim(),
        company: job.company.trim(),
        department: job.department?.trim() || null,
        location: job.location.trim(),
        job_type: job.job_type || 'Full-time',
        description: job.description.trim(),
        skills: job.skills || [],
        benefits: job.benefits || [],
        remote_available: job.remote_available || false,
        urgent_hiring: job.urgent_hiring || false,
        experience_level: job.experience_level || 'Mid Level',
        application_deadline: job.application_deadline || null,
        contact_email: job.contact_email?.trim() || null,
        created_by: user.id,
        status: 'active',
        applications_count: 0,
        views_count: 0
      };

      console.log('📝 Prepared job data:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData as any)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error creating job:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        if (error.code === '23505') {
          throw new Error('A job with similar details already exists');
        } else if (error.code === '23503') {
          throw new Error('Invalid user reference. Please try logging out and back in.');
        } else if (error.message?.includes('permission')) {
          throw new Error('You do not have permission to create jobs. Please contact support.');
        } else {
          throw new Error(`Failed to create referral: ${error.message}`);
        }
      }

      console.log('✅ Job created successfully:', data);

      return data;
    } catch (error: any) {
      console.error('❌ Error in createJob:', error);

      if (error.message?.includes('Failed to create referral') ||
        error.message?.includes('must be logged in') ||
        error.message?.includes('fill in all required fields')) {
        throw error;
      }

      throw new Error('An unexpected error occurred while creating the referral. Please try again.');
    }
  },

  // Update job
  updateJob: async (id: string, updates: JobUpdate) => {
    const { data, error } = await (supabase
      .from('jobs') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete job
  deleteJob: async (id: string) => {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get user's jobs with accurate application counts
  getUserJobs: async (userId?: string) => {
    let ownerId = userId;
    if (!ownerId) {
      const { data: { user } } = await supabase.auth.getUser();
      ownerId = user?.id;
    }
    if (!ownerId) throw new Error('Not authenticated');

    const { data: jobs, error: jobsError } = await (supabase
      .from('jobs') as any)
      .select('*')
      .eq('created_by', ownerId)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job: any) => {
        const { data: applications, error: appError } = await (supabase
          .from('applications') as any)
          .select('id')
          .eq('job_id', job.id);

        if (appError) {
          console.error('Error getting application count for job:', job.id, appError);
          return { ...job, applications_count: 0 };
        }

        return { ...job, applications_count: applications?.length || 0 };
      })
    );

    return jobsWithCounts;
  },

  // Increment view count
  incrementViewCount: async (id: string) => {
    const { error } = await (supabase.rpc('increment_job_views', { job_id: id } as any) as any);
    if (error) throw error;
  },

  // Keep the private Storage object path in the application. Authorized
  // viewers receive a short-lived signed URL when they open the resume.
  uploadResume: async (file: File, userId: string): Promise<string> => {
    if (!/\.pdf$/i.test(file.name) || file.size > 5 * 1024 * 1024 || file.size === 0) {
      throw new Error('Please upload a PDF resume up to 5 MB.');
    }
    const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (signature !== '%PDF-') throw new Error('This file is not a valid PDF.');
    const path = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, file, { upsert: false, contentType: 'application/pdf' });

    if (uploadError) {
      throw new Error(`Failed to upload resume: ${uploadError.message}`);
    }

    return path;
  },

  // The database derives identity/state, validates the resume and assigns the referrer atomically.
  createApplication: async (application: { job_id: string; applicant_id: string; cover_letter?: string | null; resume: string; email?: string }) => {
    const { data, error } = await supabase.rpc('submit_application' as any, {
      p_job_id: application.job_id, p_resume_path: application.resume,
    } as any);
    if (error) {
      if (error.code === '23505') throw new Error('You have already applied to this job.');
      throw new Error(error.message);
    }
    if (!data) throw new Error('The application was not saved. Please try again.');
    // Milestone mail selects its own authorized recipient on the server.
    void supabase.functions.invoke('send-referral-application-milestone', {
      body: { jobId: application.job_id },
    }).catch(() => undefined);
    return application.job_id;
  },

  getUserApplications: async () => {
    const { data, error } = await supabase.from('applicant_applications' as any).select('job_id');
    if (error) throw error;
    return (data || []).map((app: any) => app.job_id);
  },

  // Fetch this user's first-viewed timestamp for each of the given jobs
  // (drives the per-user 24h "New" tag).
  getFirstViewedMap: async (jobIds: string[]): Promise<Record<string, string>> => {
    if (jobIds.length === 0) return {};
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('job_first_views' as any)
      .select('job_id, first_viewed_at')
      .eq('user_id', user.id)
      .in('job_id', jobIds);

    if (error) {
      console.warn('Failed to fetch job first-view map:', error);
      return {};
    }

    const map: Record<string, string> = {};
    (data as any[] || []).forEach((row) => {
      map[row.job_id] = row.first_viewed_at;
    });
    return map;
  },

  // Record this user's first view of each job that isn't already tracked.
  // Safe to call repeatedly — ignores duplicates so the earliest view wins.
  recordJobFirstViews: async (jobIds: string[]): Promise<void> => {
    if (jobIds.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rows = jobIds.map((job_id) => ({ job_id, user_id: user.id }));
    const { error } = await supabase
      .from('job_first_views' as any)
      .upsert(rows as any, { onConflict: 'job_id,user_id', ignoreDuplicates: true });

    if (error) {
      console.warn('Failed to record job first views:', error);
    }
  },
};
