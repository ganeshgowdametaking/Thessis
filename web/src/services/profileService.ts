import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'

// type Profile = ... (removed for linting)
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export const profileService = {
  // Get current user's profile
  getCurrentProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, work_email, work_email_verified, secondary_email, secondary_email_verified, avatar_url, cover_image_url, title, company, location, bio, country_code, experiences, education, skills, achievements, connections_count, verified')
      .eq('id', user.id)
      .single()

    // Handle the case where no profile exists yet
    if (error && error.code === 'PGRST116') {
      return null
    }

    if (error) throw error
    return data
  },

  // Get profile by ID
  getProfile: async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, work_email_verified, secondary_email_verified, avatar_url, cover_image_url, title, company, location, bio, country_code, experiences, education, skills, achievements, verified')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Get lightweight profile summary
  getProfileSummary: async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create profile
  createProfile: async (profile: ProfileInsert) => {
    const { data, error } = await (supabase
      .from('profiles') as any)
      .insert(profile)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update profile
  updateProfile: async (id: string, updates: ProfileUpdate) => {
    const { data, error } = await (supabase
      .from('profiles') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  },

  // OPTIMIZED: Search profiles with improved performance
  searchProfiles: async (query: string, filters?: {
    education?: string
    company?: string
    industry?: string
  }) => {
    console.log('🚀 Fast search starting for:', query)
    const startTime = performance.now()

    try {
      // Build optimized query with specific field selection for speed
      let queryBuilder = supabase
        .from('profiles')
        .select('id, full_name, title, company, location, bio, avatar_url, connections_count, verified, created_at')

      // Apply search query if provided - optimized for speed
      if (query && query.trim()) {
        // Use simpler OR syntax for better performance
        queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,title.ilike.%${query}%,company.ilike.%${query}%`)
      }

      // Apply company filter if provided
      if (filters?.company && filters.company.trim()) {
        queryBuilder = queryBuilder.ilike('company', `%${filters.company}%`)
      }

      // Execute with optimized limits and ordering
      const { data, error } = await queryBuilder
        .limit(20) // Reduced limit for faster results
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Search query failed:', error)
        throw new Error(`Search failed: ${error.message}`)
      }

      const endTime = performance.now()
      console.log(`🚀 Search completed in ${(endTime - startTime).toFixed(2)}ms`)
      console.log('📊 Found', data?.length || 0, 'profiles')

      return data || []
    } catch (error) {
      console.error('❌ ProfileService search error:', error)
      throw error
    }
  },

  // Get suggested connections
  getSuggestedConnections: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, title, company, avatar_url, verified')
      .limit(10)

    if (error) throw error
    return data
  }
}
