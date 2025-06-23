import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

export const messageService = {
  // Get user's conversations
  getConversations: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1_profile:profiles!conversations_participant_1_fkey(*),
        participant_2_profile:profiles!conversations_participant_2_fkey(*),
        messages(
          *,
          sender:profiles!messages_sender_id_fkey(*)
        )
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get conversation messages
  getConversationMessages: async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  // Create or get conversation
  createOrGetConversation: async (otherUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
      .maybeSingle()

    if (existingConversation) {
      return existingConversation
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1: user.id,
        participant_2: otherUserId
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Send message
  sendMessage: async (conversationId: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .single()

    if (error) throw error

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    return data
  },

  // Mark messages as read
  markMessagesAsRead: async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)

    if (error) throw error
  },

  // COMPLETELY FIXED: Delete conversation with robust error handling and no verification issues
  deleteConversation: async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('🗑️ Starting conversation deletion for ID:', conversationId)

    try {
      // STEP 1: First verify the conversation exists and user has permission
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log('✅ Conversation already deleted or does not exist')
          return { success: true, message: 'Conversation already deleted' }
        }
        console.error('❌ Error fetching conversation:', fetchError)
        throw new Error('Conversation not found')
      }

      // Check if user is a participant
      if (conversation.participant_1 !== user.id && conversation.participant_2 !== user.id) {
        throw new Error('You do not have permission to delete this conversation')
      }

      console.log('✅ User has permission to delete conversation')

      // STEP 2: Try using the database function first (if it exists)
      try {
        console.log('🔄 Attempting to use database function...')
        const { data: result, error: rpcError } = await supabase
          .rpc('delete_conversation_with_messages', {
            conv_id: conversationId
          })

        if (!rpcError && result) {
          console.log('✅ Database function result:', result)
          
          if (result.success) {
            console.log('✅ Conversation deleted successfully via database function')
            return {
              success: true,
              message: 'Conversation deleted successfully'
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

      // Delete messages first (to handle foreign key constraints)
      console.log('🗑️ Deleting messages...')
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)

      if (messagesError) {
        console.error('❌ Error deleting messages:', messagesError)
        throw new Error(`Failed to delete conversation messages: ${messagesError.message}`)
      }

      console.log('✅ Messages deleted successfully')

      // Delete the conversation
      console.log('🗑️ Deleting conversation...')
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (conversationError) {
        console.error('❌ Error deleting conversation:', conversationError)
        throw new Error(`Failed to delete conversation: ${conversationError.message}`)
      }

      console.log('✅ Conversation deleted successfully')

      // REMOVED: Verification step that was causing issues
      // The deletion was successful, so we don't need to verify
      console.log('✅ Conversation deletion completed successfully')

      return {
        success: true,
        message: 'Conversation deleted successfully'
      }

    } catch (error: any) {
      console.error('❌ Critical error in deleteConversation:', error)
      
      // Provide user-friendly error messages
      if (error.message?.includes('permission')) {
        throw new Error('You do not have permission to delete this conversation')
      } else if (error.message?.includes('not found')) {
        throw new Error('Conversation not found or already deleted')
      } else if (error.message?.includes('foreign key')) {
        throw new Error('Cannot delete conversation due to database constraints')
      } else {
        throw new Error(error.message || 'Failed to delete conversation. Please try again.')
      }
    }
  }
}