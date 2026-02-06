import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'

type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

export const notificationService = {
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

  // FIXED: Create notification using RPC function to bypass RLS
  createNotification: async (notification: Omit<NotificationInsert, 'user_id'>, userId: string) => {
    try {
      console.log('🔔 Creating notification for user:', userId)
      console.log('📝 Notification data:', notification)

      // Check if a similar notification already exists to prevent duplicates
      // This is especially important for connection requests
      // Check if a similar notification already exists to prevent duplicates
      // This is especially important for connection requests
      // NOTE: This check might not work for cross-user notifications due to RLS,
      // but we keep it for self-notifications or admin contexts.
      // If we are sending to another user, we trust the RPC or just allow it.

      // Simplified: We skip the advanced metadata check for now to avoid RLS confusion
      // and rely on the UI/Application logic to not spam requests.


      // Use RPC function directly to bypass RLS for system notifications
      const { data, error } = await supabase
        .rpc('create_notification_safely', {
          notification_type: notification.type,
          notification_title: notification.title,
          notification_message: notification.message,
          target_user_id: userId,
          notification_actionable: notification.actionable || false,
          notification_priority: notification.priority || 'medium',
          notification_metadata: notification.metadata || null
        })

      if (error) {
        console.error('❌ Error creating notification via RPC:', error)
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      console.log('✅ Notification created successfully via RPC:', data)
      return data
    } catch (error) {
      console.error('❌ Error in createNotification:', error)
      throw error
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

  // Test function to create a sample notification
  createTestNotification: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const testNotification = {
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working',
        actionable: false,
        priority: 'medium',
        metadata: { test: true }
      }

      return await notificationService.createNotification(testNotification, user.id)
    } catch (error) {
      console.error('Error creating test notification:', error)
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