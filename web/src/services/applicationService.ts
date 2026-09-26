import { supabase } from '../lib/supabase'
import { jobService } from './jobService'
import { Database } from '../lib/database.types'

type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

export const applicationService = {
  getJobApplications: async (jobId: string, limit = 200, offset = 0) => {
    const { data, error } = await supabase.rpc('get_job_applications' as any, {
      p_job_id: jobId, p_offset: offset, p_limit: limit,
    } as any)
    if (error) throw error
    return data || []
  },

  getUserApplications: async () => {
    const { data, error } = await supabase.from('applicant_applications' as any)
      .select('*').order('applied_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  createApplication: async (application: { job_id: string; resume_url: string }) => {
    return jobService.createApplication({ job_id: application.job_id, resume: application.resume_url, applicant_id: '' })
  },

  updateApplication: async (id: string, updates: ApplicationUpdate) => {
    const { data, error } = await (supabase.from('applications') as any).update(updates)
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },

  shortlistApplication: async (id: string) => {
    return applicationService.updateApplication(id, { shortlisted: true, status: 'shortlisted' })
  },

  deleteApplication: async (id: string) => {
    const { data, error } = await supabase.rpc('remove_job_application' as any, { p_application_id: id } as any)
    if (error) throw error
    if (data !== true) throw new Error('The application was not removed. Please refresh and try again.')
  },
}
