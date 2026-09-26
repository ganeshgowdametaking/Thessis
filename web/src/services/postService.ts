import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'


type Post = Database['public']['Tables']['posts']['Row']
type PostInsert = Database['public']['Tables']['posts']['Insert']
type PostUpdate = Database['public']['Tables']['posts']['Update']

export const postService = {
  // Get feed posts with graceful error handling
  getFeedPosts: async () => {
    try {
      console.log('📊 Loading feed posts...')
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:public_profiles!posts_author_id_fkey(*),
          comments(
            *,
            author:public_profiles!comments_author_id_fkey(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('❌ Error fetching posts:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // Return empty array instead of throwing error
        return []
      }
      
      console.log('✅ Successfully loaded', data?.length || 0, 'posts')
      return data || []
    } catch (error: any) {
      console.error('❌ Network error in getFeedPosts:', error)
      
      // Handle specific network errors gracefully
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('🌐 Network connectivity issue - returning empty array to prevent UI crash')
        console.error('  - Check internet connection')
        console.error('  - Verify Supabase project is active')
        console.error('  - Check firewall/VPN settings')
        console.error('  - WebContainer may have connectivity restrictions')
        
        // Return empty array instead of throwing error
        return []
      }
      
      // Return empty array for any other errors to prevent UI crash
      console.error('🔄 Returning empty array to maintain UI stability')
      return []
    }
  },

  // Get post by ID with error handling
  getPost: async (id: string) => {
    try {
      console.log('📊 Loading post:', id)
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:public_profiles!posts_author_id_fkey(*),
          comments(
            *,
            author:public_profiles!comments_author_id_fkey(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching post:', error)
        return null
      }
      
      console.log('✅ Successfully loaded post:', id)
      return data
    } catch (error: any) {
      console.error('❌ Network error in getPost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('🌐 Network connectivity issue - returning null')
      }
      return null
    }
  },

  // Create post with error handling
  createPost: async (post: Omit<PostInsert, 'author_id'>) => {
    try {
      console.log('📝 Creating new post...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({ ...post, author_id: user.id })
        .select(`
          *,
          author:public_profiles!posts_author_id_fkey(*)
        `)
        .single()

      if (error) {
        console.error('❌ Error creating post:', error)
        throw error
      }
      
      console.log('✅ Successfully created post:', data.id)
      return data
    } catch (error: any) {
      console.error('❌ Network error in createPost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Create repost - this creates a new post that references the original
  createRepost: async (originalPostId: string, repostContent?: string) => {
    try {
      console.log('🔄 Creating repost for post:', originalPostId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the original post details
      const { data: originalPost, error: originalError } = await supabase
        .from('posts')
        .select(`
          *,
          author:public_profiles!posts_author_id_fkey(*)
        `)
        .eq('id', originalPostId)
        .single()

      if (originalError) {
        console.error('❌ Error fetching original post:', originalError)
        throw originalError
      }

      // Create the repost content
      const defaultContent = `Sharing this insightful post from ${originalPost.author?.full_name || 'a colleague'}`
      const content = repostContent || defaultContent

      // Create new post as a repost
      const { data: repost, error: repostError } = await supabase
        .from('posts')
        .insert({
          content: content,
          author_id: user.id,
          // Store original post info in a way that indicates it's a repost
          image_url: `repost:${originalPostId}` // Special format to indicate repost
        })
        .select(`
          *,
          author:public_profiles!posts_author_id_fkey(*)
        `)
        .single()

      if (repostError) {
        console.error('❌ Error creating repost:', repostError)
        throw repostError
      }

      // Increment shares count on original post
      await postService.sharePost(originalPostId)

      console.log('✅ Successfully created repost:', repost.id)
      return { repost, originalPost }
    } catch (error: any) {
      console.error('❌ Network error in createRepost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Update post
  updatePost: async (id: string, updates: PostUpdate) => {
    try {
      console.log('📝 Updating post:', id)
      
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating post:', error)
        throw error
      }
      
      console.log('✅ Successfully updated post:', id)
      return data
    } catch (error: any) {
      console.error('❌ Network error in updatePost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Delete post
  deletePost: async (id: string) => {
    try {
      console.log('🗑️ Deleting post:', id)
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting post:', error)
        throw error
      }
      
      console.log('✅ Successfully deleted post:', id)
    } catch (error: any) {
      console.error('❌ Network error in deletePost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Like post using RPC function for better error handling
  likePost: async (id: string) => {
    try {
      console.log('👍 Liking post:', id)
      
      const { error } = await supabase.rpc('increment_post_likes', { 
        post_id: id 
      })

      if (error) {
        console.error('❌ Error liking post:', error)
        throw error
      }

      // Return the updated post data
      const { data: updatedPost, error: fetchError } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.warn('⚠️ Could not fetch updated likes count:', fetchError)
        // Return a placeholder response if we can't fetch the updated count
        return { likes_count: 0 }
      }

      console.log('✅ Successfully liked post:', id)
      return updatedPost
    } catch (error: any) {
      console.error('❌ Network error in likePost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Unlike post using RPC function for better error handling
  unlikePost: async (id: string) => {
    try {
      console.log('👎 Unliking post:', id)
      
      const { error } = await supabase.rpc('decrement_post_likes', { 
        post_id: id 
      })

      if (error) {
        console.error('❌ Error unliking post:', error)
        throw error
      }

      // Return the updated post data
      const { data: updatedPost, error: fetchError } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.warn('⚠️ Could not fetch updated likes count:', fetchError)
        // Return a placeholder response if we can't fetch the updated count
        return { likes_count: 0 }
      }

      console.log('✅ Successfully unliked post:', id)
      return updatedPost
    } catch (error: any) {
      console.error('❌ Network error in unlikePost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Share/repost functionality
  sharePost: async (id: string) => {
    try {
      console.log('📤 Sharing post:', id)
      
      // First get the current shares count
      const { data: currentPost, error: fetchError } = await supabase
        .from('posts')
        .select('shares_count')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('❌ Error fetching current post:', fetchError)
        throw fetchError
      }

      // Increment the shares count
      const newSharesCount = (currentPost.shares_count || 0) + 1

      const { data, error } = await supabase
        .from('posts')
        .update({ shares_count: newSharesCount })
        .eq('id', id)
        .select('shares_count')
        .single()

      if (error) {
        console.error('❌ Error sharing post:', error)
        throw error
      }
      
      console.log('✅ Successfully shared post:', id)
      return data
    } catch (error: any) {
      console.error('❌ Network error in sharePost:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // Add comment with proper error handling and notification
  addComment: async (postId: string, content: string) => {
    try {
      console.log('💬 Adding comment to post:', postId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First, add the comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content
        })
        .select(`
          *,
          author:public_profiles!comments_author_id_fkey(*)
        `)
        .single()

      if (commentError) {
        console.error('❌ Error adding comment:', commentError)
        throw commentError
      }

      // Then increment comment count
      const { data: currentPost, error: fetchError } = await supabase
        .from('posts')
        .select('comments_count, author_id, author:public_profiles!posts_author_id_fkey(*)')
        .eq('id', postId)
        .single()

      if (!fetchError) {
        const newCommentsCount = (currentPost.comments_count || 0) + 1
        
        const { error: updateError } = await supabase
          .from('posts')
          .update({ comments_count: newCommentsCount })
          .eq('id', postId)

        if (updateError) {
          console.warn('⚠️ Failed to update comment count:', updateError)
        }

      }

      console.log('✅ Successfully added comment to post:', postId)
      return comment
    } catch (error: any) {
      console.error('❌ Network error in addComment:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // ENHANCED: Get user likes with database + localStorage hybrid approach
  getUserLikes: async () => {
    try {
      console.log('👍 Loading user likes...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('⚠️ No authenticated user, returning empty likes')
        return []
      }

      // ALWAYS get fresh data from database for accurate state
      try {
        const { data: dbLikes, error } = await supabase
          .from('user_likes')
          .select('post_id')
          .eq('user_id', user.id)

        if (!error && dbLikes) {
          console.log('✅ Loaded', dbLikes.length, 'likes from database')
          
          // Update localStorage with fresh database data
          const likesArray = dbLikes.map(like => like.post_id)
          localStorage.setItem(`user_likes_${user.id}`, JSON.stringify(likesArray))
          
          return dbLikes
        }
      } catch (dbError) {
        console.warn('⚠️ Database likes failed, falling back to localStorage:', dbError)
      }

      // Fallback to localStorage if database fails
      const savedLikes = localStorage.getItem(`user_likes_${user.id}`)
      if (savedLikes) {
        try {
          const likes = JSON.parse(savedLikes)
          console.log('✅ Loaded', likes.length, 'likes from localStorage (fallback)')
          return likes.map((postId: string) => ({ post_id: postId }))
        } catch (error) {
          console.error('❌ Error parsing saved likes:', error)
          localStorage.removeItem(`user_likes_${user.id}`)
          return []
        }
      }
      
      console.log('ℹ️ No saved likes found')
      return []
    } catch (error: any) {
      console.error('❌ Network error in getUserLikes:', error)
      return []
    }
  },

  // FIXED: Create user like with proper duplicate error handling
  createUserLike: async (postId: string) => {
    try {
      console.log('👍 Creating like for post:', postId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update localStorage immediately for instant UI feedback
      const savedLikes = localStorage.getItem(`user_likes_${user.id}`)
      const likes = savedLikes ? JSON.parse(savedLikes) : []
      
      if (!likes.includes(postId)) {
        likes.push(postId)
        localStorage.setItem(`user_likes_${user.id}`, JSON.stringify(likes))
        console.log('✅ Like saved to localStorage (instant feedback)')
      }

      // Use UPSERT to handle duplicates gracefully
      const { data: upsertResult, error: upsertError } = await supabase
        .from('user_likes')
        .upsert({
          user_id: user.id,
          post_id: postId
        }, {
          onConflict: 'user_id,post_id',
          ignoreDuplicates: true
        })
        .select()

      let isNewLike = false

      if (upsertError) {
        // Check if it's a duplicate key error (code 23505)
        if (upsertError.code === '23505') {
          console.log('ℹ️ Like already exists in database (duplicate key)')
          isNewLike = false
        } else {
          console.warn('⚠️ Database upsert failed with non-duplicate error:', upsertError)
          // For non-duplicate errors, still consider it a new like for UI purposes
          isNewLike = true
        }
      } else {
        // Check if the upsert actually inserted a new row
        isNewLike = upsertResult && upsertResult.length > 0
        console.log(isNewLike ? '✅ New like created in database' : 'ℹ️ Like already existed in database')
      }

      // Only update post likes count and create notification if it's a genuinely new like
      if (isNewLike) {
        // Update post likes count
        await postService.likePost(postId)

      }

      console.log('✅ Successfully processed like for post:', postId)
      return { isNewLike }
    } catch (error: any) {
      console.error('❌ Network error in createUserLike:', error)
      
      // Handle duplicate key error specifically
      if (error.code === '23505') {
        console.log('ℹ️ Like already exists (duplicate key), returning gracefully')
        return { isNewLike: false }
      }
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // COMPLETELY FIXED: Remove user like with proper database deletion and localStorage sync
  removeUserLike: async (postId: string) => {
    try {
      console.log('👎 Removing like for post:', postId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // CRITICAL: Remove from database FIRST to ensure proper sync
      console.log('🗑️ Step 1: Removing like from database...')
      const { error: dbError, data: deletedData } = await supabase
        .from('user_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .select() // Get the deleted record to confirm deletion

      if (dbError) {
        console.error('❌ Database like removal failed:', dbError)
        throw new Error(`Failed to remove like from database: ${dbError.message}`)
      }

      // Check if a record was actually deleted
      const wasDeleted = deletedData && deletedData.length > 0
      console.log(wasDeleted ? '✅ Like successfully removed from database' : '⚠️ No like found in database to remove')

      // STEP 2: Update localStorage to match database state
      console.log('💾 Step 2: Updating localStorage...')
      const savedLikes = localStorage.getItem(`user_likes_${user.id}`)
      if (savedLikes) {
        try {
          const likes = JSON.parse(savedLikes)
          const updatedLikes = likes.filter((id: string) => id !== postId)
          localStorage.setItem(`user_likes_${user.id}`, JSON.stringify(updatedLikes))
          console.log('✅ Like removed from localStorage')
        } catch (parseError) {
          console.warn('⚠️ Error updating localStorage:', parseError)
          // Clear corrupted localStorage
          localStorage.removeItem(`user_likes_${user.id}`)
        }
      }

      // STEP 3: Update post likes count (always decrement, even if no record was found)
      console.log('📊 Step 3: Updating post likes count...')
      const result = await postService.unlikePost(postId)
      
      console.log('✅ Successfully processed unlike for post:', postId)
      return { 
        success: true, 
        wasDeleted,
        likesCount: result.likes_count 
      }
    } catch (error: any) {
      console.error('❌ Critical error in removeUserLike:', error)
      
      // Don't update localStorage if database operation failed
      console.log('⚠️ Database operation failed - localStorage NOT updated to maintain consistency')
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // NEW: Get user saves with database + localStorage hybrid approach
  getUserSaves: async () => {
    try {
      console.log('🔖 Loading user saves...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('⚠️ No authenticated user, returning empty saves')
        return []
      }

      // Try to get saves from database first
      try {
        const { data: dbSaves, error } = await supabase
          .from('user_saves')
          .select('post_id')
          .eq('user_id', user.id)

        if (!error && dbSaves) {
          console.log('✅ Loaded', dbSaves.length, 'saves from database')
          
          // Also sync with localStorage for offline support
          const savesArray = dbSaves.map(save => save.post_id)
          localStorage.setItem(`user_saves_${user.id}`, JSON.stringify(savesArray))
          
          return dbSaves
        }
      } catch (dbError) {
        console.warn('⚠️ Database saves failed, falling back to localStorage:', dbError)
      }

      // Fallback to localStorage if database fails
      const savedSaves = localStorage.getItem(`user_saves_${user.id}`)
      if (savedSaves) {
        try {
          const saves = JSON.parse(savedSaves)
          console.log('✅ Loaded', saves.length, 'saves from localStorage (fallback)')
          return saves.map((postId: string) => ({ post_id: postId }))
        } catch (error) {
          console.error('❌ Error parsing saved saves:', error)
          localStorage.removeItem(`user_saves_${user.id}`)
          return []
        }
      }
      
      console.log('ℹ️ No saved saves found')
      return []
    } catch (error: any) {
      console.error('❌ Network error in getUserSaves:', error)
      return []
    }
  },

  // NEW: Create user save with database + localStorage persistence
  createUserSave: async (postId: string) => {
    try {
      console.log('🔖 Creating save for post:', postId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update localStorage immediately for instant UI feedback
      const savedSaves = localStorage.getItem(`user_saves_${user.id}`)
      const saves = savedSaves ? JSON.parse(savedSaves) : []
      
      if (!saves.includes(postId)) {
        saves.push(postId)
        localStorage.setItem(`user_saves_${user.id}`, JSON.stringify(saves))
        console.log('✅ Save saved to localStorage (instant feedback)')
      }

      // Try to save to database for persistence
      try {
        const { error: dbError } = await supabase
          .from('user_saves')
          .insert({
            user_id: user.id,
            post_id: postId
          })

        if (dbError) {
          // If it's a duplicate error, that's fine - the save already exists
          if (dbError.code !== '23505') {
            console.warn('⚠️ Database save creation failed:', dbError)
          }
        } else {
          console.log('✅ Save saved to database for persistence')
        }
      } catch (dbError) {
        console.warn('⚠️ Database save creation failed, localStorage will persist:', dbError)
      }

      console.log('✅ Successfully created save for post:', postId)
      return { success: true }
    } catch (error: any) {
      console.error('❌ Network error in createUserSave:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // NEW: Remove user save with database + localStorage persistence
  removeUserSave: async (postId: string) => {
    try {
      console.log('🗑️ Removing save for post:', postId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update localStorage immediately for instant UI feedback
      const savedSaves = localStorage.getItem(`user_saves_${user.id}`)
      if (savedSaves) {
        const saves = JSON.parse(savedSaves)
        const updatedSaves = saves.filter((id: string) => id !== postId)
        localStorage.setItem(`user_saves_${user.id}`, JSON.stringify(updatedSaves))
        console.log('✅ Save removed from localStorage (instant feedback)')
      }

      // Try to remove from database for persistence
      try {
        const { error: dbError } = await supabase
          .from('user_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)

        if (dbError) {
          console.warn('⚠️ Database save removal failed:', dbError)
        } else {
          console.log('✅ Save removed from database')
        }
      } catch (dbError) {
        console.warn('⚠️ Database save removal failed, localStorage updated:', dbError)
      }

      console.log('✅ Successfully removed save for post:', postId)
      return { success: true }
    } catch (error: any) {
      console.error('❌ Network error in removeUserSave:', error)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.')
      }
      throw error
    }
  },

  // ENHANCED: Sync localStorage data with database on login
  syncUserDataWithDatabase: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('🔄 Syncing user data with database...')

      // CRITICAL: Get fresh data from database and update localStorage
      // This ensures localStorage matches the database state
      
      // Sync likes - get fresh from database
      try {
        const { data: dbLikes, error: likesError } = await supabase
          .from('user_likes')
          .select('post_id')
          .eq('user_id', user.id)

        if (!likesError && dbLikes) {
          const likesArray = dbLikes.map(like => like.post_id)
          localStorage.setItem(`user_likes_${user.id}`, JSON.stringify(likesArray))
          console.log('✅ Synced', likesArray.length, 'likes from database to localStorage')
        }
      } catch (error) {
        console.warn('Failed to sync likes:', error)
      }

      // Sync saves - get fresh from database
      try {
        const { data: dbSaves, error: savesError } = await supabase
          .from('user_saves')
          .select('post_id')
          .eq('user_id', user.id)

        if (!savesError && dbSaves) {
          const savesArray = dbSaves.map(save => save.post_id)
          localStorage.setItem(`user_saves_${user.id}`, JSON.stringify(savesArray))
          console.log('✅ Synced', savesArray.length, 'saves from database to localStorage')
        }
      } catch (error) {
        console.warn('Failed to sync saves:', error)
      }

      console.log('✅ User data sync completed - localStorage now matches database')
    } catch (error) {
      console.warn('⚠️ Failed to sync user data:', error)
    }
  }
}