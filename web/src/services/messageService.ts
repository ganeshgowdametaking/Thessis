import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

export const messageService = {
  // Get user's conversations (Optimized)
  // Get user's conversations (Optimized)
  getConversations: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message_at,
        participant_1,
        participant_2,
        deleted_by_p1,
        deleted_by_p2,
        participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, avatar_url, verified, title),
        participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, avatar_url, verified, title),
        messages(
          content,
          created_at,
          sender_id,
          read
        )
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' })

    if (error) throw error
    if (!conversations) return []

    // Filter out conversations hidden by the current user and those with no messages.
    return conversations.filter((conv: any) => {
      const isP1 = conv.participant_1 === user.id
      const hiddenForCurrentUser = isP1 ? conv.deleted_by_p1 === true : conv.deleted_by_p2 === true
      return !hiddenForCurrentUser && conv.messages && conv.messages.length > 0
    })
  },

  // Get conversation messages
  // Get conversation messages with pagination
  getConversationMessages: async (conversationId: string, limit = 50, beforeTimestamp?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Fetch user-specific deletion cutoff to support "start fresh" behavior.
    let deletedCutoff: string | null = null
    try {
      const { data: conv } = await supabase
        .from('conversations')
        .select('participant_1, participant_2, deleted_at_p1, deleted_at_p2')
        .eq('id', conversationId)
        .maybeSingle()

      if (conv) {
        const isP1 = (conv as any).participant_1 === user.id
        deletedCutoff = isP1 ? ((conv as any).deleted_at_p1 || null) : ((conv as any).deleted_at_p2 || null)
      }
    } catch {
      // If cutoff fields don't exist yet, continue without cutoff filtering.
      deletedCutoff = null
    }

    let query = supabase
      .from('messages')
      .select(`*`) // Optimized: Removed heavy profile join. UI should handle sender info via caching/context.
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }) // Fetch latest first
      .limit(limit)

    if (deletedCutoff) {
      query = query.gt('created_at', deletedCutoff)
    }

    if (beforeTimestamp) {
      query = query.lt('created_at', beforeTimestamp)
    }

    const { data, error } = await query

    if (error) throw error

    // Reverse to show oldest first in the UI (if needed by UI logic, but standard chat UI usually handles this)
    // Actually, usually we want them sorted by time ascending for the display loop.
    // Sync: The UI expects [oldest, ..., newest] to render top-to-bottom.
    // But we fetched [newest, ..., oldest] to get the *latest* 50.
    // So we must reverse the result.
    return data ? data.reverse() : []
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
        participant_2: otherUserId,
        last_message_at: new Date().toISOString()
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

    // Update conversation timestamp and un-hide only for sender.
    // Keep deleted_at cutoff intact so old messages remain hidden for this user.
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId)
      .maybeSingle()

    if (conv) {
      const isP1 = (conv as any).participant_1 === user.id
      await supabase
        .from('conversations')
        .update(
          isP1
            ? { last_message_at: new Date().toISOString(), deleted_by_p1: false }
            : { last_message_at: new Date().toISOString(), deleted_by_p2: false }
        )
        .eq('id', conversationId)
    }

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

  // Soft Delete conversation
  deleteConversation: async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('🗑️ Starting soft deletion for ID:', conversationId)

    try {
      // Prefer DB-side safe deletion when available.
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('delete_conversation_safely', { conversation_id: conversationId, user_id: user.id })

      if (!rpcError && rpcResult === true) {
        console.log('✅ Conversation deleted via RPC delete_conversation_safely')
        return { success: true }
      }

      // 1. Fetch the conversation to see which participant current user is
      const { data: conv, error: fetchError } = await supabase
        .from('conversations')
        .select('id, participant_1, participant_2, deleted_by_p1, deleted_by_p2')
        .eq('id', conversationId)
        .single()

      if (fetchError || !conv) {
        console.warn("Conversation not found for deletion");
        return { success: true }; // Treat as success if already gone
      }

      const isP1 = conv.participant_1 === user.id;
      const isP2 = conv.participant_2 === user.id;

      if (!isP1 && !isP2) {
        throw new Error('You do not have permission to delete this conversation.')
      }

      const alreadyDeleted = isP1 ? conv.deleted_by_p1 === true : conv.deleted_by_p2 === true
      if (alreadyDeleted) {
        return { success: true }
      }

      // 2. Mark as deleted for THIS user only
      const nowIso = new Date().toISOString()
      const updateData = isP1
        ? { deleted_by_p1: true, deleted_at_p1: nowIso }
        : { deleted_by_p2: true, deleted_at_p2: nowIso };

      const { data: updatedConvs, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq(isP1 ? 'participant_1' : 'participant_2', user.id)
        .select('id');

      if (error) throw error;
      if (!updatedConvs || updatedConvs.length === 0) {
        throw new Error('Conversation deletion did not persist. Please try again.')
      }

      console.log('✅ Conversation soft deleted successfully')
      return { success: true }

    } catch (error: any) {
      console.error('❌ Error in soft delete:', error)
      throw new Error(error.message || 'Failed to delete conversation.')
    }
  },

  // Get count of unread messages for the current user
  getUnreadMessagesCount: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    // Get all conversations for the user
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2, deleted_by_p1, deleted_by_p2')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
    if (error) throw error;
    if (!conversations || conversations.length === 0) return 0;

    const visibleConversationIds = (conversations as any[])
      .filter((conv: any) => {
        const isP1 = conv.participant_1 === user.id
        return isP1 ? conv.deleted_by_p1 !== true : conv.deleted_by_p2 !== true
      })
      .map((conv: any) => conv.id)

    if (visibleConversationIds.length === 0) return 0

    // Get count of unread messages in all conversations where the user is not the sender
    const { count, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', visibleConversationIds)
      .eq('read', false)
      .neq('sender_id', user.id);
    if (countError) throw countError;
    return count || 0;
  }
}
