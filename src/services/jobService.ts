import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { notificationService } from './notificationService';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];
type ApplicationInsert = Database['public']['Tables']['applications']['Insert'];

export const jobService = {
  // Get all jobs with retry logic
  getJobs: async (filters?: {
    location?: string;
    jobType?: string;
    remote?: boolean;
  }, retries: number = 2): Promise<Job[]> => {
    let queryBuilder = supabase
      .from('jobs')
      .select(`
        *,
        created_by_profile:profiles!jobs_created_by_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .eq('status', 'open');

    if (filters?.location) {
      queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
    }

    if (filters?.jobType) {
      queryBuilder = queryBuilder.eq('job_type', filters.jobType);
    }

    if (filters?.remote !== undefined) {
      queryBuilder = queryBuilder.eq('remote_available', filters.remote);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error } = await queryBuilder;
        if (error) {
          console.error(`Attempt ${attempt + 1} - Error fetching jobs from Supabase:`, error.message, error.details);
          if (attempt === retries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
        console.log(`Attempt ${attempt + 1} - Fetched jobs:`, data);
        return data || [];
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
        created_by_profile:profiles!jobs_created_by_fkey(*)
      `)
      .eq('id', id)
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
        status: 'open',
        applications_count: 0,
        views_count: 0
      };

      console.log('📝 Prepared job data:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
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
          .eq('status', 'accepted');

        if (connections.data && connections.data.length > 0) {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('full_name, company')
            .eq('id', user.id)
            .single();

          for (const connection of connections.data) {
            const recipientId = connection.requester_id === user.id 
              ? connection.addressee_id 
              : connection.requester_id;

            try {
              await notificationService.createNotification({
                type: 'referral',
                title: 'New Job Referral Opportunity',
                message: `${referrerProfile?.full_name || 'Someone'} referred you for ${data.title} at ${data.company}. This could be a great opportunity for you!`,
                actionable: true,
                priority: 'high',
                metadata: {
                  job_id: data.id,
                  referrer_id: user.id,
                  company: data.company,
                  title: data.title
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
    const { data, error } = await supabase
      .from('jobs')
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
  getUserJobs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const { data: applications, error: appError } = await supabase
          .from('applications')
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
    const { error } = await supabase.rpc('increment_job_views', { job_id: id });
    if (error) throw error;
  },

  // Create application
  createApplication: async (application: Omit<ApplicationInsert, 'user_id'> & { resume: File }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to apply.');
      }

      // Validate required fields
      if (!application.job_id || !application.email || !application.phone || !application.resume) {
        throw new Error('Job ID, email, phone number, and resume are required.');
      }

      // Simulate resume upload (replace with actual storage logic)
      const resumeUrl = `placeholder_resume_url_${application.resume.name}`; // Replace with Supabase storage upload

      const applicationData: ApplicationInsert = {
        job_id: application.job_id,
        user_id: user.id,
        email: application.email.trim(),
        phone: application.phone.trim(),
        cover_letter: application.cover_letter?.trim() || null,
        resume_url: resumeUrl,
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select('job_id')
        .single();

      if (error) {
        console.error('Error creating application:', error);
        if (error.code === '23505') {
          throw new Error('You have already applied to this job.');
        }
        throw new Error(`Failed to submit application: ${error.message}`);
      }

      console.log('Application created:', data);
      return data.job_id;
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

      const { data, error } = await supabase
        .from('applications')
        .select('job_id')
        .eq('user_id', user.id)
        .eq('status', 'submitted'); // Only fetch submitted applications

      if (error) {
        console.error('Error fetching user applications:', error);
        throw error;
      }

      console.log('Fetched user applications:', data);
      return data.map(app => app.job_id);
    } catch (error: any) {
      console.error('Error in getUserApplications:', error);
      throw new Error('Failed to load your applications.');
    }
  }
};