import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'
import { notificationService } from './notificationService'

type Connection = Database['public']['Tables']['connections']['Row']

export const connectionService = {
  // Get user's connections
  getConnections: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(*),
        addressee:profiles!connections_addressee_id_fkey(*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (error) throw error
    return data || []
  },

  // Get connection requests (both sent and received)
  getConnectionRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(*),
        addressee:profiles!connections_addressee_id_fkey(*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'pending')

    if (error) throw error
    return data || []
  },

  // Send connection request with duplicate checking and notification
  sendConnectionRequest: async (addresseeId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('🔗 Sending connection request from', user.id, 'to', addresseeId)

    // Handle mock users
    if (addresseeId.startsWith('mock-')) {
      return connectionService.handleMockConnection(addresseeId, 'connect')
    }

    // CRITICAL: Clear cache BEFORE database operation
    const cacheKey = `connection_${user.id}_${addresseeId}`
    localStorage.removeItem(cacheKey)
    console.log('🗑️ Cleared cache before sending connection request')

    // First, check if any connection already exists (any status)
    const { data: existingConnection, error: checkError } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing connection:', checkError)
      throw checkError
    }

    if (existingConnection) {
      // Connection already exists, don't create a new one
      console.log('⚠️ Connection already exists:', existingConnection)
      
      // FIXED: Update cache to reflect existing connection
      const status = existingConnection.status === 'pending' 
        ? (existingConnection.requester_id === user.id ? 'pending_sent' : 'pending_received')
        : existingConnection.status === 'accepted' ? 'connected' : 'none'
      
      const cacheData = {
        status: status,
        connection_id: existingConnection.id,
        timestamp: Date.now(),
        last_action: 'check_existing'
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log('💾 Updated cache for existing connection:', cacheData)
      
      return existingConnection
    }

    // No existing connection, create new one
    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating connection request:', error)
      throw error
    }
    
    console.log('✅ Connection request created successfully:', data)
    
    // FIXED: Store in localStorage with proper key and immediate update
    const cacheData = {
      status: 'pending_sent',
      connection_id: data.id,
      timestamp: Date.now(),
      last_action: 'connect'
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    console.log('💾 Cached connection state:', cacheData)

    // Create notification for the addressee
    try {
      // Get current user's profile for notification
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name, title, company')
        .eq('id', user.id)
        .single()

      // FIXED: Check if a notification already exists for this connection request
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', addresseeId)
        .eq('type', 'connection')
        .filter('metadata->connection_id', 'eq', data.id)
        
      // Only create a new notification if one doesn't already exist
      if (!existingNotifications || existingNotifications.length === 0) {
        await notificationService.createNotification({
          type: 'connection',
          title: 'New Connection Request',
          message: `${requesterProfile?.full_name || 'Someone'} wants to connect with you${requesterProfile?.title ? ` • ${requesterProfile.title}` : ''}${requesterProfile?.company ? ` at ${requesterProfile.company}` : ''}`,
          actionable: true,
          priority: 'high',
          metadata: {
            connection_id: data.id,
            requester_id: user.id
          }
        }, addresseeId)
      } else {
        console.log('⚠️ Notification already exists for this connection request, skipping creation')
      }
    } catch (notificationError) {
      console.warn('Failed to create connection notification:', notificationError)
    }
    
    return data
  },

  // Accept connection request
  acceptConnectionRequest: async (connectionId: string) => {
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
      .select()
      .single()

    if (error) throw error
    
    // Update localStorage cache
    const { data: { user } } = await supabase.auth.getUser()
    if (user && data) {
      const otherUserId = data.requester_id === user.id ? data.addressee_id : data.requester_id
      const cacheKey = `connection_${user.id}_${otherUserId}`
      const cacheData = {
        status: 'connected',
        connection_id: data.id,
        timestamp: Date.now(),
        last_action: 'accept'
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log('💾 Updated cache after accept:', cacheData)

      // Create notification for the requester
      try {
        const { data: accepterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        await notificationService.createNotification({
          type: 'connection',
          title: 'Connection Accepted',
          message: `${accepterProfile?.full_name || 'Someone'} accepted your connection request`,
          actionable: false,
          priority: 'medium',
          metadata: {
            connection_id: data.id,
            accepter_id: user.id
          }
        }, data.requester_id === user.id ? data.addressee_id : data.requester_id)
      } catch (notificationError) {
        console.warn('Failed to create connection accepted notification:', notificationError)
      }
    }
    
    return data
  },

  // Decline/Cancel connection request
  declineConnectionRequest: async (connectionId: string) => {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)

    if (error) throw error
  },

  // COMPLETELY FIXED: Cancel connection request with proper authentication context
  cancelConnectionRequest: async (otherUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ User not authenticated')
      throw new Error('Not authenticated')
    }

    console.log('🔄 CANCELLING connection between', user.id, 'and', otherUserId)

    const cacheKey = `connection_${user.id}_${otherUserId}`

    // Handle mock users
    if (otherUserId.startsWith('mock-')) {
      localStorage.removeItem(cacheKey)
      console.log('📱 Removed mock connection state from localStorage')
      return { success: true, message: 'Mock connection cancelled' }
    }

    try {
      // STEP 1: Find the connection to delete
      console.log('🔍 Step 1: Finding connection to delete between users:', user.id, 'and', otherUserId)
      
      const { data: connectionToDelete, error: findError } = await supabase
        .from('connections')
        .select('*')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`)
        .maybeSingle()

      if (findError && findError.code !== 'PGRST116') {
        console.error('❌ Error finding connection to delete:', findError)
        throw new Error(`Failed to find connection: ${findError.message}`)
      }

      if (!connectionToDelete) {
        console.log('⚠️ No connection found to delete - already deleted or never existed')
        // Clear cache since no connection exists
        localStorage.removeItem(cacheKey)
        console.log('🗑️ Cleared cache for non-existent connection')
        return { success: true, message: 'Connection already deleted' }
      }

      console.log('🎯 Found connection to delete:', connectionToDelete)
      
      // STEP 2: Try using the database function first (if it exists)
      try {
        console.log('🔄 Attempting to use database function...')
        const { data: result, error: rpcError } = await supabase
          .rpc('delete_connection_safely', 
            { connection_id: connectionToDelete.id }
          )

        if (!rpcError && result) {
          console.log('✅ Database function result:', result)
          
          if (result.success) {
            console.log('✅ Connection deleted successfully via database function')
            return {
              success: true,
              message: 'Connection deleted successfully'
            }
          } else {
            console.warn('⚠️ Database function returned failure:', result.error)
            // Fall through to manual deletion
          }
        } else if (rpcError) {
          console.warn('⚠️ Database function failed:', rpcError.message)
          // Fall through to manual deletion
        }
      } catch (rpcError) {
        console.warn('⚠️ Database function not available, using manual deletion:', rpcError)
      }

      // STEP 3: Manual deletion as fallback
      console.log('🔄 Using manual deletion method...')

      // Delete the connection
      const { error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionToDelete.id)

      if (deleteError) {
        console.error('❌ Error deleting connection:', deleteError)
        throw new Error(`Failed to delete connection: ${deleteError.message}`)
      }

      console.log('✅ Connection deleted successfully')

      // STEP 4: Clear cache only after successful verification
      console.log('🗑️ Step 4: Clearing localStorage cache...')
      localStorage.removeItem(cacheKey)
      console.log('✅ Cache cleared successfully')

      // STEP 5: Delete any pending notifications for this connection
      try {
        // Find notifications related to this connection
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('type', 'connection')
          .filter('metadata->connection_id', 'eq', connectionToDelete.id)
          
        if (notifications && notifications.length > 0) {
          console.log(`🔍 Found ${notifications.length} notifications to delete for this connection`)
          
          // Delete each notification
          for (const notification of notifications) {
            await notificationService.deleteNotification(notification.id)
          }
          
          console.log('✅ Deleted all related notifications')
        }
      } catch (notificationError) {
        console.warn('⚠️ Error cleaning up notifications:', notificationError)
        // Don't fail the whole operation if notification cleanup fails
      }

      console.log('🎯 Connection cancellation completed successfully')
      return { success: true, message: 'Connection cancelled and deleted successfully' }

    } catch (error: any) {
      console.error('❌ CRITICAL ERROR in cancelConnectionRequest:', error)
      
      // Don't clear cache on error - let the UI show the actual state
      console.log('⚠️ Cache NOT cleared due to error - UI will reflect actual database state')
      
      // Provide specific error messages for common issues
      if (error.message?.includes('RLS policy') || error.message?.includes('policy')) {
        throw new Error('Permission denied: Unable to delete connection due to database security policy. Please contact support.\n\nTechnical details: RLS policy restriction')
      } else if (error.message?.includes('delete function returned false')) {
        throw new Error('Unable to delete connection: You may not have permission to delete this connection.')
      } else if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error('Database configuration error: Required function is missing. Please contact support.')
      } else {
        // Re-throw with more context
        throw new Error(`Connection cancellation failed: ${error.message}`)
      }
    }
  },

  // COMPLETELY FIXED: Get connection status - DATABASE FIRST ALWAYS
  getConnectionStatus: async (otherUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('🔍 Getting connection status between', user.id, 'and', otherUserId)

    // Handle mock users (they start with 'mock-')
    if (otherUserId.startsWith('mock-')) {
      // For mock users, check localStorage for persistence
      const mockConnectionKey = `connection_${user.id}_${otherUserId}`
      const savedState = localStorage.getItem(mockConnectionKey)
      
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          console.log('📱 Retrieved mock connection state from localStorage:', state.status)
          return state.status
        } catch (error) {
          console.error('❌ Error parsing localStorage state:', error)
          localStorage.removeItem(mockConnectionKey) // Clean up corrupted data
          return 'none'
        }
      }
      
      console.log('📱 No mock connection state found - returning "none"')
      return 'none' // Default for mock users
    }

    // CRITICAL FIX: For real users, ALWAYS check database first (NEVER use cache on initial load)
    console.log('🔍 Checking database for fresh connection status (DATABASE-FIRST)...')
    
    const { data: connection, error } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error getting connection status:', error)
      throw error
    }

    let status = 'none'

    if (!connection) {
      console.log('✅ No connection found - status: "none" (will show "Connect")')
      status = 'none' // No connection exists - button will show "Connect"
    } else if (connection.status === 'accepted') {
      console.log('✅ Connection is accepted - status: "connected"')
      status = 'connected'
    } else if (connection.status === 'pending') {
      // Check if current user sent the request
      if (connection.requester_id === user.id) {
        console.log('✅ User sent pending request - status: "pending_sent" (will show "Cancel Request")')
        status = 'pending_sent' // User sent the request - button will show "Cancel Request"
      } else {
        console.log('✅ User received pending request - status: "pending_received"')
        status = 'pending_received' // User received the request
      }
    }

    // CRITICAL FIX: Update cache ONLY AFTER getting fresh database result
    const cacheKey = `connection_${user.id}_${otherUserId}`
    const cacheData = {
      status: status,
      connection_id: connection?.id || null,
      timestamp: Date.now(),
      last_action: 'database_check'
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    console.log('💾 Updated cache with fresh database result:', cacheData)

    return status
  },

  // Handle mock user connections - COMPLETELY FIXED
  handleMockConnection: async (mockUserId: string, action: 'connect' | 'cancel') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const mockConnectionKey = `connection_${user.id}_${mockUserId}`
    
    if (action === 'connect') {
      // Save pending state to localStorage
      const connectionState = {
        status: 'pending_sent',
        requester_id: user.id,
        addressee_id: mockUserId,
        timestamp: Date.now(),
        last_action: 'connect',
        created_at: new Date().toISOString()
      }
      localStorage.setItem(mockConnectionKey, JSON.stringify(connectionState))
      console.log('📱 Saved mock connection state to localStorage (Connect → Cancel Request):', connectionState)
      return connectionState
      
    } else if (action === 'cancel') {
      // Remove from localStorage - this returns state to "Connect"
      localStorage.removeItem(mockConnectionKey)
      console.log('📱 Removed mock connection state from localStorage (Cancel Request → Connect)')
      return { success: true, message: 'Mock connection cancelled' }
    }
  },

  // FIXED: Force refresh connection status (clears cache and gets fresh data)
  forceRefreshConnectionStatus: async (otherUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Clear cache first
    const cacheKey = `connection_${user.id}_${otherUserId}`
    localStorage.removeItem(cacheKey)
    console.log('🔄 Force refreshing connection status for:', otherUserId)

    // Get fresh status from database
    return await connectionService.getConnectionStatus(otherUserId)
  },

  // Clear connection cache for a specific user (useful for forced refresh)
  clearConnectionCache: (otherUserId: string) => {
    const { data: { user } } = supabase.auth.getUser()
    if (user) {
      const cacheKey = `connection_${user.id}_${otherUserId}`
      localStorage.removeItem(cacheKey)
      console.log('🗑️ Cleared connection cache for user:', otherUserId)
    }
  },

  // Clear all connection caches (useful for logout)
  clearAllConnectionCaches: () => {
    const { data: { user } } = supabase.auth.getUser()
    if (user) {
      // Find all connection cache keys for this user
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`connection_${user.id}_`)) {
          keysToRemove.push(key)
        }
      }
      
      // Remove all found keys
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log('🗑️ Cleared all connection caches for user:', user.id)
    }
  }
}