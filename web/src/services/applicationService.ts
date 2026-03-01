import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'
import { notificationService } from './notificationService'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationInsert = Database['public']['Tables']['applications']['Insert']
type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

export const applicationService = {
  // Get applications for a job
  getJobApplications: async (jobId: string) => {
    console.log('🔍 Fetching applications for job ID:', jobId);

    try {
      // Try with applicant_id first
      let { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            full_name,
            title,
            company,
            location,
            avatar_url,
            bio
          ),
          job:jobs!applications_job_id_fkey(*)
        `)
        .eq('job_id', jobId as any)
        .order('applied_at', { ascending: false });

      // If that fails, try with user_id
      if (error && error.message?.includes('user_id')) {
        console.log('Retrying getJobApplications with user_id field...');
        const result = await supabase
          .from('applications')
          .select(`
            *,
            applicant:profiles!applications_user_id_fkey(*),
            job:jobs!applications_job_id_fkey(*)
          `)
          .eq('job_id', jobId as any)
          .order('applied_at', { ascending: false });

        data = result.data as any;
        error = result.error;
      }

      if (error) {
        console.error('❌ Supabase error fetching applications:', error);
        throw error;
      }

      console.log('✅ Successfully fetched applications:', data);
      return (data as any[]) || [];
    } catch (error) {
      console.error('❌ Error in getJobApplications:', error);
      throw error;
    }
  },

  // Get user's applications
  getUserApplications: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs!applications_job_id_fkey(*)
      `)
      .eq('applicant_id', user.id as any)
      .order('applied_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Create application with notification
  createApplication: async (application: Omit<ApplicationInsert, 'applicant_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('applications')
      .insert({ ...application, applicant_id: user.id } as any)
      .select(`
        *,
        job:jobs!applications_job_id_fkey(*),
        applicant:profiles!applications_applicant_id_fkey(*)
      `)
      .single()

    if (error) throw error

    // Create notification for job creator
    if ((data as any).job && (data as any).job.created_by && (data as any).job.created_by !== user.id) {
      try {
        await notificationService.createNotification({
          type: 'job',
          title: 'New Job Application',
          message: `${(data as any).applicant?.full_name || 'Someone'} applied for ${(data as any).job.title} at ${(data as any).job.company}`,
          actionable: true,
          priority: 'high',
          metadata: {
            job_id: (data as any).job.id,
            application_id: data.id,
            applicant_id: user.id
          }
        }, (data as any).job.created_by)
      } catch (notificationError) {
        console.warn('Failed to create application notification:', notificationError)
      }
    }

    // Trigger backend milestone email notifications (1 and 5 applications).
    try {
      const { error: milestoneEmailError } = await supabase.functions.invoke(
        'send-referral-application-milestone',
        { body: { jobId: (data as any).job_id } }
      )

      if (milestoneEmailError) {
        console.warn('Failed to trigger referral milestone email:', milestoneEmailError)
      }
    } catch (milestoneInvokeError) {
      console.warn('Failed to invoke referral milestone email function:', milestoneInvokeError)
    }

    return data
  },

  // Update application
  updateApplication: async (id: string, updates: ApplicationUpdate) => {
    const { data, error } = await supabase
      .from('applications')
      .update(updates as any)
      .eq('id', id as any)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Shortlist application with notification
  shortlistApplication: async (id: string) => {
    const { data, error } = await supabase
      .from('applications')
      .update({ shortlisted: true, status: 'shortlisted' } as any)
      .eq('id', id as any)
      .select(`
        *,
        job:jobs!applications_job_id_fkey(*),
        applicant:profiles!applications_applicant_id_fkey(*)
      `)
      .single()

    if (error) throw error

    // Create notification for applicant
    if ((data as any).applicant_id) {
      try {
        await notificationService.createNotification({
          type: 'job',
          title: 'Application Shortlisted',
          message: `Great news! You've been shortlisted for ${(data as any).job?.title} at ${(data as any).job?.company}. The hiring team will be in touch soon.`,
          actionable: false,
          priority: 'high',
          metadata: {
            job_id: (data as any).job_id,
            application_id: (data as any).id
          }
        }, (data as any).applicant_id)
      } catch (notificationError) {
        console.warn('Failed to create shortlist notification:', notificationError)
      }
    }

    return data
  },

  // Delete application
  deleteApplication: async (id: string) => {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id as any);

    if (error) throw error;
  }
}
