import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { notificationService } from './notificationService';

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
          .from('jobs')
          .select('*, created_by_profile:profiles!jobs_created_by_fkey(response_metric, work_email_verified, work_email)')
          .eq('status', 'active' as any)
          .order('created_at', { ascending: false });

        // Exclude jobs created by the current user
        if (currentUserId) {
          query = query.neq('created_by', currentUserId);
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

  // Get job by ID
  getJob: async (id: string) => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        created_by_profile:profiles!jobs_created_by_fkey(id, full_name, role, work_email_verified, avatar_url, title, company, location, response_metric)
      `)
      .eq('id', id as any)
      .single();

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

      try {
        const connections = await supabase
          .from('connections')
          .select(`
            *,
            requester:profiles!connections_requester_id_fkey(*),
            addressee:profiles!connections_addressee_id_fkey(*)
          `)
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted' as any);

        if (connections.data && connections.data.length > 0) {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('full_name, company')
            .eq('id', user.id as any)
            .single();

          for (const connection of (connections.data as any[])) {
            const recipientId = connection.requester_id === user.id
              ? connection.addressee_id
              : connection.requester_id;

            try {
              await notificationService.createNotification({
                type: 'referral',
                title: 'New Job Referral Opportunity',
                message: `${(referrerProfile as any)?.full_name || 'Someone'} referred you for ${(data as any).title} at ${(data as any).company}. This could be a great opportunity for you!`,
                actionable: true,
                priority: 'high',
                metadata: {
                  job_id: (data as any).id,
                  referrer_id: user.id,
                  company: (data as any).company,
                  title: (data as any).title
                }
              }, recipientId);
            } catch (notificationError) {
              console.warn(`Failed to create referral notification for user ${recipientId}:`, notificationError);
            }
          }
        }
      } catch (notificationError) {
        console.warn('Failed to create referral notifications (non-critical):', notificationError);
      }

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

  // Create application
  createApplication: async (application: {
    job_id: string;
    applicant_id: string;
    cover_letter?: string | null;
    resume: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to apply.');
      }

      // Validate required fields
      if (!application.job_id || !application.resume) {
        throw new Error('Job ID and resume are required.');
      }

      console.log('🔍 DEBUG: Application data received:', application);
      console.log('🔍 DEBUG: User ID from auth:', user.id);
      console.log('🔍 DEBUG: Applicant ID from application:', application.applicant_id);

      // Simulate resume upload (replace with actual storage logic)
      const resumeUrl = application.resume; // S3 URL is now passed in

      const applicationData = {
        job_id: application.job_id,
        applicant_id: user.id, // Use user.id directly instead of application.applicant_id
        resume_url: resumeUrl,
        status: 'submitted'
      };

      console.log('🔍 DEBUG: Final application data to insert:', applicationData);

      // Try to insert with the correct field name
      let { data, error } = await supabase
        .from('applications')
        .insert(applicationData as any)
        .select('job_id')
        .single();

      // If that fails, try with user_id instead of applicant_id
      if (error && error.message?.includes('user_id')) {
        console.log('Retrying with user_id field...');
        const applicationDataWithUserId = {
          job_id: application.job_id,
          user_id: user.id, // Use user.id directly
          resume_url: resumeUrl,
          status: 'submitted'
        };

        console.log('🔍 DEBUG: Retry with user_id data:', applicationDataWithUserId);

        const result = await supabase
          .from('applications')
          .insert(applicationDataWithUserId as any)
          .select('job_id')
          .single();

        data = result.data;
        error = result.error;
      }

      // If that fails, try with profile_id
      if (error && error.message?.includes('profile_id')) {
        console.log('Retrying with profile_id field...');
        const applicationDataWithProfileId = {
          job_id: application.job_id,
          profile_id: user.id, // Use user.id as profile_id
          resume_url: resumeUrl,
          status: 'submitted'
        };

        console.log('🔍 DEBUG: Retry with profile_id data:', applicationDataWithProfileId);

        const result = await supabase
          .from('applications')
          .insert(applicationDataWithProfileId as any)
          .select('job_id')
          .single();

        data = result.data;
        error = result.error;
      }

      // If that fails, try with user_profile_id
      if (error && error.message?.includes('user_profile_id')) {
        console.log('Retrying with user_profile_id field...');
        const applicationDataWithUserProfileId = {
          job_id: application.job_id,
          user_profile_id: user.id, // Use user.id as user_profile_id
          resume_url: resumeUrl,
          status: 'submitted'
        };

        console.log('🔍 DEBUG: Retry with user_profile_id data:', applicationDataWithUserProfileId);

        const result = await supabase
          .from('applications')
          .insert(applicationDataWithUserProfileId as any)
          .select('job_id')
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error creating application:', error);
        if (error.code === '23505') {
          throw new Error('You have already applied to this job.');
        }
        throw new Error(`Failed to submit application: ${error.message}`);
      }

      console.log('Application created:', data);

      // Trigger notification for the job creator
      try {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('title, company, created_by')
          .eq('id', application.job_id)
          .single();

        if (jobData && (jobData as any).created_by) {
          const { data: applicantProfile } = await (supabase
            .from('profiles') as any)
            .select('full_name')
            .eq('id', user.id)
            .single();

          await notificationService.createNotification({
            type: 'job_application',
            title: 'New Job Application',
            message: `${(applicantProfile as any)?.full_name || 'Someone'} has applied for your referral for ${(jobData as any).title} at ${(jobData as any).company}.`,
            actionable: true,
            priority: 'high',
            metadata: {
              job_id: application.job_id,
              applicant_id: user.id,
              company: (jobData as any).company,
              title: (jobData as any).title
            }
          }, (jobData as any).created_by);
        }
      } catch (notifErr) {
        console.warn('Failed to send application notification:', notifErr);
      }

      // Trigger backend milestone email notifications (1 and 5 applications).
      try {
        const { error: milestoneEmailError } = await supabase.functions.invoke(
          'send-referral-application-milestone',
          { body: { jobId: application.job_id } }
        );

        if (milestoneEmailError) {
          console.warn('Failed to trigger referral milestone email:', milestoneEmailError);
        }
      } catch (milestoneInvokeError) {
        console.warn('Failed to invoke referral milestone email function:', milestoneInvokeError);
      }

      return (data as any)?.job_id;
    } catch (error: any) {
      console.error('Error in createApplication:', error);
      throw error;
    }
  },

  // Get user's applications
  getUserApplications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Try with applicant_id first
      let { data, error } = await supabase
        .from('applications')
        .select('job_id')
        .eq('applicant_id', user.id as any)
        .eq('status', 'submitted'); // Only fetch submitted applications

      // If that fails, try with user_id
      if (error && error.message?.includes('user_id')) {
        console.log('Retrying getUserApplications with user_id field...');
        const result = await supabase
          .from('applications')
          .select('job_id')
          .eq('user_id', user.id as any)
          .eq('status', 'submitted');

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching user applications:', error);
        throw error;
      }

      console.log('Fetched user applications:', data);
      return (data as any[])?.map((app: any) => app.job_id) || [];
    } catch (error: any) {
      console.error('Error in getUserApplications:', error);
      throw new Error('Failed to load your applications.');
    }
  },



  // TEMPORARY DEBUG FUNCTION - Remove after debugging
  debugGetAllJobs: async () => {
    console.log('🔍 DEBUG: Fetching ALL jobs without any filters...');

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ DEBUG: Error fetching all jobs:', error);
        throw error;
      }

      console.log('✅ DEBUG: All jobs in database:', data);
      console.log('✅ DEBUG: Total jobs found:', data?.length || 0);

      if (data && data.length > 0) {
        data.forEach((job: any, index: number) => {
          console.log(`✅ DEBUG: Job ${index + 1}:`, {
            id: job.id,
            title: job.title,
            status: job.status,
            created_by: job.created_by,
            created_at: job.created_at
          });
        });
      }

      // TEST: Try filtering by status 'active' specifically
      console.log('🔍 DEBUG: Testing status filter for "active"...');
      const { data: activeJobs, error: activeError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active');

      if (activeError) {
        console.error('❌ DEBUG: Error filtering by status "active":', activeError);
      } else {
        console.log('✅ DEBUG: Jobs with status "active":', activeJobs);
        console.log('✅ DEBUG: Number of active jobs found:', activeJobs?.length || 0);
      }

      return data || [];
    } catch (error) {
      console.error('❌ DEBUG: Error in debugGetAllJobs:', error);
      throw error;
    }
  },

  // DEBUG: Check applications table schema
  debugCheckApplicationsTable: async () => {
    console.log('🔍 DEBUG: Checking applications table schema...');

    try {
      // First, let's try to see if we can access the table at all
      console.log('🔍 DEBUG: Attempting to access applications table...');

      // Try a simple select to see if the table exists
      const { data, error } = await supabase
        .from('applications')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ DEBUG: Error accessing applications table:', error);
        console.log('❌ DEBUG: This suggests the table might not exist or have different permissions');

        // Try to get more specific error information
        if (error.message) {
          console.log('❌ DEBUG: Error message:', error.message);
        }
        if (error.details) {
          console.log('❌ DEBUG: Error details:', error.details);
        }
        if (error.hint) {
          console.log('❌ DEBUG: Error hint:', error.hint);
        }

        // Try to check if the table exists by trying to select from it with different approaches
        console.log('🔍 DEBUG: Trying alternative approaches...');

        // Try without any select
        const { error: error2 } = await supabase
          .from('applications')
          .select('*');

        if (error2) {
          console.log('❌ DEBUG: Even basic select fails:', error2);
        }

        return null;
      }

      console.log('✅ DEBUG: Applications table exists and is accessible');
      console.log('✅ DEBUG: Sample data structure:', data);

      return data;
    } catch (error) {
      console.error('❌ DEBUG: Error in debugCheckApplicationsTable:', error);
      return null;
    }
  },
};
