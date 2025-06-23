import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'
import { notificationService } from './notificationService'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationInsert = Database['public']['Tables']['applications']['Insert']
type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

export const applicationService = {
  // Get applications for a job
  getJobApplications: async (jobId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        applicant:profiles!applications_applicant_id_fkey(*),
        job:jobs!applications_job_id_fkey(*)
      `)
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false })

    if (error) throw error
    return data
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
      .eq('applicant_id', user.id)
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
      .insert({ ...application, applicant_id: user.id })
      .select(`
        *,
        job:jobs!applications_job_id_fkey(*),
        applicant:profiles!applications_applicant_id_fkey(*)
      `)
      .single()

    if (error) throw error

    // Create notification for job creator
    if (data.job && data.job.created_by && data.job.created_by !== user.id) {
      try {
        await notificationService.createNotification({
          type: 'job',
          title: 'New Job Application',
          message: `${data.applicant?.full_name || 'Someone'} applied for ${data.job.title} at ${data.job.company}`,
          actionable: true,
          priority: 'high',
          metadata: {
            job_id: data.job.id,
            application_id: data.id,
            applicant_id: user.id
          }
        }, data.job.created_by)
      } catch (notificationError) {
        console.warn('Failed to create application notification:', notificationError)
      }
    }

    return data
  },

  // Update application
  updateApplication: async (id: string, updates: ApplicationUpdate) => {
    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Shortlist application with notification
  shortlistApplication: async (id: string) => {
    const { data, error } = await supabase
      .from('applications')
      .update({ shortlisted: true, status: 'shortlisted' })
      .eq('id', id)
      .select(`
        *,
        job:jobs!applications_job_id_fkey(*),
        applicant:profiles!applications_applicant_id_fkey(*)
      `)
      .single()

    if (error) throw error

    // Create notification for applicant
    if (data.applicant_id) {
      try {
        await notificationService.createNotification({
          type: 'job',
          title: 'Application Shortlisted',
          message: `Great news! You've been shortlisted for ${data.job?.title} at ${data.job?.company}. The hiring team will be in touch soon.`,
          actionable: false,
          priority: 'high',
          metadata: {
            job_id: data.job_id,
            application_id: data.id
          }
        }, data.applicant_id)
      } catch (notificationError) {
        console.warn('Failed to create shortlist notification:', notificationError)
      }
    }

    return data
  }
}