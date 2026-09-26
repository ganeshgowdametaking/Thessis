import { supabase } from '../lib/supabase'

// Types removed as they were unused and causing lint warnings

export const messageService = {
  // Get user's conversations (Optimized)
  // Get user's conversations (Optimized)
  getConversations: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Optimized: Use more targeted query to reduce payload and heavy JS filtering.
    // Note: participant profile joins are necessary for the sidebar, but we minimize fields.
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message_at,
        last_message_preview,
        last_message_sender_id,
        unread_count_p1,
        unread_count_p2,
        participant_1,
        participant_2,
        deleted_by_p1,
        deleted_by_p2,
        participant_1_profile:public_profiles!conversations_participant_1_fkey(id, full_name, avatar_url, verified, title),
        participant_2_profile:public_profiles!conversations_participant_2_fkey(id, full_name, avatar_url, verified, title)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    if (!conversations) return []

    // Unified Visibility Logic:
    // Only show chats that have SOME history (preview OR timestamp),
    // and ensure we don't accidentally hide legacy data that lacks a preview.
    return conversations.filter((conv: any) => {
      const isP1 = conv.participant_1 === user.id
      const isHidden = isP1 ? conv.deleted_by_p1 === true : conv.deleted_by_p2 === true
      const hasHistory = !!conv.last_message_preview || !!conv.last_message_at
      return !isHidden && hasHistory
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
    const { data, error } = await (supabase
      .from('conversations')
      .insert({
        participant_1: user.id,
        participant_2: otherUserId,
      } as any) as any)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Send message
  sendMessage: async (conversationId: string, content: string, attachment?: { url: string, type: string, name: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const messageData: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      content
    }

    if (attachment) {
      messageData.attachment_url = attachment.url
      messageData.attachment_type = attachment.type
      messageData.attachment_name = attachment.name
    }

    const { data, error } = await (supabase
      .from('messages')
      .insert(messageData as any) as any)
      .select(`
        *,
        sender:public_profiles!messages_sender_id_fkey(*)
      `)
      .single()

    if (error) throw error

    // Note: Manual conversation timestamp/visibility updates removed.
    // These are now handled atomically on the server via the 'tr_on_message_inserted' trigger.

    return data
  },

  // Object references remain private; short-lived URLs are generated when displayed.
  uploadAttachment: async (file: File, conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const extensions: Record<string, string> = {
      'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    }
    const extension = extensions[file.type]
    if (!extension || file.size === 0 || file.size > 5 * 1024 * 1024) {
      throw new Error('Choose a PDF, JPG, PNG or WebP file up to 5 MB.')
    }
    const path = `${user.id}/${conversationId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('message-attachments').upload(path, file, { upsert: false, contentType: file.type })
    if (error) throw error
    return { url: path, type: file.type, name: file.name }
  },

  getAttachmentUrl: async (reference: string) => {
    if (reference.startsWith('blob:')) return reference // local upload preview only
    let path = reference
    if (/^https?:/.test(reference)) {
      const source = new URL(reference)
      const project = new URL(import.meta.env.VITE_SUPABASE_URL)
      const prefix = '/storage/v1/object/public/message-attachments/'
      if (source.origin !== project.origin || !source.pathname.startsWith(prefix)) throw new Error('Attachment unavailable')
      path = decodeURIComponent(source.pathname.slice(prefix.length))
    }
    if (!path || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Attachment unavailable')
    const { data, error } = await supabase.storage.from('message-attachments').createSignedUrl(path, 300)
    if (error || !data?.signedUrl) throw new Error('You cannot access this attachment')
    return data.signedUrl
  },

  // Mark messages as read
  markMessagesAsRead: async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // 1. Mark individual messages as read (for history)
    const { error } = await (supabase
      .from('messages')
      .update({ read: true } as any) as any)
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)

    if (error) throw error

    // Read counters are updated atomically by the database trigger.
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

      const isP1 = (conv as any).participant_1 === user.id;
      const isP2 = (conv as any).participant_2 === user.id;

      if (!isP1 && !isP2) {
        throw new Error('You do not have permission to delete this conversation.')
      }

      const alreadyDeleted = isP1 ? (conv as any).deleted_by_p1 === true : (conv as any).deleted_by_p2 === true
      if (alreadyDeleted) {
        return { success: true }
      }

      // 2. Mark as deleted for THIS user only
      const nowIso = new Date().toISOString()
      const updateData = isP1
        ? { deleted_by_p1: true, deleted_at_p1: nowIso }
        : { deleted_by_p2: true, deleted_at_p2: nowIso };

      const { data: updatedConvs, error } = await (supabase
        .from('conversations')
        .update(updateData as any) as any)
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

    // Super-Optimized: Single sum query on the conversations table.
    // No more ID-gathering or message scanning.
    const { data, error } = await supabase
      .from('conversations')
      .select('unread_count_p1, unread_count_p2, participant_1, deleted_by_p1, deleted_by_p2')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    if (error) throw error;
    if (!data) return 0;

    return data.reduce((total: number, conv: any) => {
      const isP1 = conv.participant_1 === user.id;
      const isHidden = isP1 ? conv.deleted_by_p1 : conv.deleted_by_p2;
      if (isHidden) return total;

      const count = isP1 ? (conv.unread_count_p1 || 0) : (conv.unread_count_p2 || 0);
      return total + count;
    }, 0);
  }
}
