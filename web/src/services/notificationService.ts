import { supabase } from '../lib/supabase'


export const notificationService = {
  getReferredEmployee: async (applicationId: string): Promise<string> => {
    const { data, error } = await supabase.rpc('get_referred_employee' as any, { p_application_id: applicationId } as any)
    if (error || typeof data !== 'string') throw new Error('A confirmed referral is required to open this conversation.')
    return data
  },
  // Get user's notifications with better error handling
  getNotifications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user found')
        return []
      }

      console.log('🔔 Loading notifications for user:', user.id)

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error loading notifications:', error)
        throw error
      }

      console.log('✅ Loaded notifications:', data?.length || 0, 'notifications')
      console.log('📋 Notifications data:', data)

      return data || []
    } catch (error) {
      console.error('❌ Error in getNotifications:', error)
      return []
    }
  },

  // Mark notification as read
  markAsRead: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  },

  // Delete notification
  deleteNotification: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  },

  // Get count of unread notifications for the current user
  getUnreadNotificationsCount: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) throw error;
    return count || 0;
  },

  // Mark notification as read and non-actionable
  markAsReadAndNonActionable: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, actionable: false })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking notification as read and non-actionable:', error);
      throw error;
    }
  },
}