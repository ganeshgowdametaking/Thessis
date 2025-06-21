import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Camera, Video, Send, ThumbsUp, Users, Briefcase, TrendingUp, Plus, Filter, X, Crop, Upload, UserPlus, UserMinus, EyeOff } from 'lucide-react';
import { postService } from '../services/postService';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { useAuthContext } from '../contexts/AuthContext';
import ImageCropper from './ImageCropper';

interface HomePageProps {
  onViewProfile: (userId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onViewProfile }) => {
  const { user } = useAuthContext();
  const [newPost, setNewPost] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showPostMenu, setShowPostMenu] = useState<number | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<Record<number, boolean>>({});
  const [userSaves, setUserSaves] = useState<Record<number, boolean>>({});
  const [userConnections, setUserConnections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadFeedData();
    loadUserLikes();
    loadUserSaves();
    loadUserConnections();
    
    // Sync data with database on component mount
    postService.syncUserDataWithDatabase();
  }, []);

  const loadFeedData = async () => {
    try {
      setLoading(true);
      setConnectionError(null);
      
      const feedPosts = await postService.getFeedPosts();
      
      // Transform posts to include repost information
      const transformedPosts = feedPosts.map(post => {
        let transformedPost = { ...post };
        
        // Check if this is a repost (indicated by special image_url format)
        if (post.image_url && post.image_url.startsWith('repost:')) {
          const originalPostId = post.image_url.replace('repost:', '');
          transformedPost.isRepost = true;
          transformedPost.originalPostId = originalPostId;
          transformedPost.image_url = null; // Clear the special repost marker
          
          // Find the original post in the feed
          const originalPost = feedPosts.find(p => p.id === originalPostId);
          if (originalPost) {
            transformedPost.originalPost = originalPost;
          }
        }
        
        return transformedPost;
      });
      
      setPosts(transformedPosts);
    } catch (error: any) {
      console.error('Error loading feed:', error);
      setPosts([]);
      
      // Set user-friendly error message
      if (error.message?.includes('Network connection failed') || error.message?.includes('Failed to fetch')) {
        setConnectionError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setConnectionError('Failed to load posts. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Load user likes with persistence
  const loadUserLikes = async () => {
    try {
      const likes = await postService.getUserLikes();
      const likesMap: Record<number, boolean> = {};
      likes.forEach((like: any) => {
        likesMap[like.post_id] = true;
      });
      setUserLikes(likesMap);
      console.log('✅ Loaded user likes:', Object.keys(likesMap).length);
    } catch (error) {
      console.error('Error loading user likes:', error);
      // Set empty likes map as fallback
      setUserLikes({});
    }
  };

  // NEW: Load user saves with persistence
  const loadUserSaves = async () => {
    try {
      const saves = await postService.getUserSaves();
      const savesMap: Record<number, boolean> = {};
      saves.forEach((save: any) => {
        savesMap[save.post_id] = true;
      });
      setUserSaves(savesMap);
      console.log('✅ Loaded user saves:', Object.keys(savesMap).length);
    } catch (error) {
      console.error('Error loading user saves:', error);
      // Set empty saves map as fallback
      setUserSaves({});
    }
  };

  const loadUserConnections = async () => {
    try {
      const connections = await connectionService.getConnections();
      const connectionsMap: Record<string, string> = {};
      
      connections.forEach((connection: any) => {
        if (connection.requester_id === user?.id) {
          // User sent the request
          if (connection.status === 'pending') {
            connectionsMap[connection.addressee_id] = 'pending_sent';
          } else if (connection.status === 'accepted') {
            connectionsMap[connection.addressee_id] = 'connected';
          }
        } else if (connection.addressee_id === user?.id) {
          // User received the request
          if (connection.status === 'pending') {
            connectionsMap[connection.requester_id] = 'pending_received';
          } else if (connection.status === 'accepted') {
            connectionsMap[connection.requester_id] = 'connected';
          }
        }
      });
      
      setUserConnections(connectionsMap);
    } catch (error) {
      console.error('Error loading user connections:', error);
      setUserConnections({});
    }
  };

  // Format time to relative format (3 min ago, 3 hours ago, etc.)
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const isPhoto = mediaType === 'photo' && file.type.startsWith('image/');
      const isVideo = mediaType === 'video' && file.type.startsWith('video/');
      
      if (!isPhoto && !isVideo) {
        alert(`Please select a valid ${mediaType} file`);
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      if (mediaType === 'photo') {
        // For photos, show upload choice modal
        setPendingImageFile(file);
        setShowUploadChoice(true);
      } else {
        // For videos, upload directly
        setSelectedMedia(file);
        const previewUrl = URL.createObjectURL(file);
        setMediaPreview(previewUrl);
      }
    }
  };

  // FIXED: Convert file to base64 for proper persistence
  const handleUploadAsIs = () => {
    if (pendingImageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setMediaPreview(base64String);
        setSelectedMedia(pendingImageFile); // Keep the original file for reference
      };
      reader.readAsDataURL(pendingImageFile);
      
      setShowUploadChoice(false);
      setPendingImageFile(null);
    }
  };

  const handleCropImage = () => {
    setShowUploadChoice(false);
    setShowImageCropper(true);
  };

  // FIXED: Handle cropped image properly with base64 conversion
  const handleCropComplete = (croppedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setMediaPreview(base64String);
      setSelectedMedia(croppedFile); // Keep the cropped file for reference
    };
    reader.readAsDataURL(croppedFile);
    
    setShowImageCropper(false);
    setPendingImageFile(null);
  };

  const handleCropCancel = () => {
    setShowImageCropper(false);
    setPendingImageFile(null);
  };

  const removeMedia = () => {
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setSelectedMedia(null);
    setMediaPreview(null);
  };

  // FIXED: Use the base64 string directly instead of uploading to storage
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim() || selectedMedia) {
      try {
        console.log('Creating post with media preview:', mediaPreview ? 'Yes' : 'No');
        
        const post = await postService.createPost({
          content: newPost || (selectedMedia ? `Shared a ${selectedMedia.type.startsWith('video/') ? 'video' : 'photo'}` : ''),
          image_url: mediaPreview // Use the base64 string directly
        });
        
        console.log('Post created successfully:', post);
        
        // Add the new post to the beginning of the posts array
        setPosts([post, ...posts]);
        setNewPost('');
        removeMedia(); // Clear selected media
      } catch (error: any) {
        console.error('Error creating post:', error);
        if (error.message?.includes('Network connection failed')) {
          alert('Network connection failed. Please check your internet connection and try again.');
        } else {
          alert('Failed to create post. Please try again.');
        }
      }
    }
  };

  // ENHANCED: Handle like with persistent storage and duplicate handling
  const handleLike = async (postId: number) => {
    try {
      const isCurrentlyLiked = userLikes[postId] || false;
      
      if (isCurrentlyLiked) {
        // Unlike the post
        await postService.removeUserLike(postId.toString());
        setUserLikes(prev => ({ ...prev, [postId]: false }));
        
        // Update the post in the local state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, likes_count: Math.max((post.likes_count || 0) - 1, 0) }
            : post
        ));
      } else {
        // Like the post
        const result = await postService.createUserLike(postId.toString());
        setUserLikes(prev => ({ ...prev, [postId]: true }));
        
        // Only update the post count if it's a new like
        if (result.isNewLike) {
          setPosts(posts.map(post => 
            post.id === postId 
              ? { ...post, likes_count: (post.likes_count || 0) + 1 }
              : post
          ));
        }
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      if (error.message?.includes('Network connection failed')) {
        alert('Network connection failed. Please check your internet connection and try again.');
      } else {
        alert('Failed to update like. Please try again.');
      }
    }
  };

  // ENHANCED: Handle bookmark/save with persistent storage
  const handleBookmark = async (postId: number) => {
    try {
      const isCurrentlySaved = userSaves[postId] || false;
      
      if (isCurrentlySaved) {
        // Remove save
        await postService.removeUserSave(postId.toString());
        setUserSaves(prev => ({ ...prev, [postId]: false }));
      } else {
        // Save post
        await postService.createUserSave(postId.toString());
        setUserSaves(prev => ({ ...prev, [postId]: true }));
      }
      
      setShowPostMenu(null);
    } catch (error: any) {
      console.error('Error toggling save:', error);
      if (error.message?.includes('Network connection failed')) {
        alert('Network connection failed. Please check your internet connection and try again.');
      } else {
        alert('Failed to update save. Please try again.');
      }
    }
  };

  const handleNotInterested = (postId: number) => {
    setPosts(posts.filter(post => post.id !== postId));
    setShowPostMenu(null);
  };

  // FIXED: Handle connection requests with proper error handling and no alerts
  const handleConnect = async (authorId: string) => {
    try {
      const currentStatus = getConnectionStatus(authorId);
      
      if (currentStatus === 'none') {
        // Send connection request
        await connectionService.sendConnectionRequest(authorId);
        // Update local state immediately for better UX
        setUserConnections(prev => ({ ...prev, [authorId]: 'pending_sent' }));
        setShowPostMenu(null);
      } else if (currentStatus === 'pending_sent') {
        // Cancel connection request
        await connectionService.cancelConnectionRequest(authorId);
        // Update local state immediately for better UX
        setUserConnections(prev => ({ ...prev, [authorId]: 'none' }));
        setShowPostMenu(null);
      }
      
      // Reload connections to ensure state is in sync with server
      await loadUserConnections();
    } catch (error: any) {
      console.error('Error handling connection:', error);
      
      // Reload connections to get the actual state from server
      await loadUserConnections();
    }
  };

  const handleRemoveConnection = async (authorId: string) => {
    try {
      await connectionService.cancelConnectionRequest(authorId);
      setUserConnections(prev => ({ ...prev, [authorId]: 'none' }));
      setShowPostMenu(null);
      
      // Reload connections to get updated status
      await loadUserConnections();
    } catch (error: any) {
      console.error('Error removing connection:', error);
    }
  };

  const handleCommentSubmit = async (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      try {
        const comment = await postService.addComment(postId.toString(), newComment);
        
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                comments: [...(post.comments || []), comment],
                comments_count: (post.comments_count || 0) + 1
              }
            : post
        ));
        setNewComment('');
      } catch (error: any) {
        console.error('Error adding comment:', error);
        if (error.message?.includes('Network connection failed')) {
          alert('Network connection failed. Please check your internet connection and try again.');
        } else {
          alert('Failed to add comment. Please try again.');
        }
      }
    }
  };

  // Get connection status for a user
  const getConnectionStatus = (authorId: string) => {
    return userConnections[authorId] || 'none';
  };

  // Check if user is connected to post author
  const isConnectedToAuthor = (authorId: string) => {
    const status = getConnectionStatus(authorId);
    return status === 'accepted' || status === 'connected';
  };

  // Get the appropriate connection button text based on status
  const getConnectionButtonText = (authorId: string) => {
    const status = getConnectionStatus(authorId);
    switch (status) {
      case 'pending_sent':
        return 'Cancel Request';
      case 'accepted':
      case 'connected':
        return 'Remove Connection';
      default:
        return 'Connect';
    }
  };

  // Handle navigation to user posts page
  const handleViewUserPosts = () => {
    if (user) {
      onViewProfile(user.id);
    }
  };

  // Handle navigation to connections page
  const handleViewConnections = () => {
    if (user) {
      onViewProfile(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  // Show connection error state
  if (connectionError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h3>
          <p className="text-slate-600 mb-6">{connectionError}</p>
          <button
            onClick={loadFeedData}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Feed - Full Width */}
        <div className="space-y-6">
          {/* Post Creator */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <form onSubmit={handlePostSubmit}>
              <div className="flex space-x-3 sm:space-x-4">
                <img
                  src="https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
                  alt="Your avatar"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full cursor-pointer flex-shrink-0"
                  onClick={() => user && onViewProfile(user.id)}
                />
                <div className="flex-1">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share your professional insights..."
                    className="w-full p-3 sm:p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-500 text-sm sm:text-base"
                    rows={3}
                  />
                  
                  {/* Media Preview - COMPLETELY FIXED to show full images */}
                  {mediaPreview && (
                    <div className="mt-4 relative bg-slate-50 rounded-lg overflow-hidden">
                      {selectedMedia?.type.startsWith('image/') || mediaPreview.startsWith('data:image/') ? (
                        <div className="relative">
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            className="w-full h-auto block"
                            style={{ 
                              maxWidth: '100%',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                          />
                          <button
                            type="button"
                            onClick={removeMedia}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <video
                            src={mediaPreview}
                            controls
                            className="w-full h-auto block"
                            style={{ 
                              maxWidth: '100%',
                              height: 'auto'
                            }}
                          />
                          <button
                            type="button"
                            onClick={removeMedia}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 space-y-3 sm:space-y-0">
                    <div className="flex space-x-2 sm:space-x-4">
                      {/* Photo Upload */}
                      <label className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 cursor-pointer text-sm sm:text-base">
                        <Camera className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleMediaUpload(e, 'photo')}
                          className="hidden"
                        />
                      </label>
                      
                      {/* Video Upload */}
                      <label className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 cursor-pointer text-sm sm:text-base">
                        <Video className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Video</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleMediaUpload(e, 'video')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={!newPost.trim() && !selectedMedia}
                      className="bg-slate-900 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium text-sm sm:text-base"
                    >
                      <Send className="h-4 w-4" />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {/* Post Header */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-3 min-w-0 flex-1">
                      <img
                        src={post.author?.avatar_url || 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'}
                        alt={post.author?.full_name || 'User'}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-shrink-0"
                        onClick={() => onViewProfile(post.author?.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 
                            className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                            onClick={() => onViewProfile(post.author?.id)}
                          >
                            {post.author?.full_name || 'Anonymous User'}
                          </h3>
                          {post.author?.verified && (
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 font-medium truncate">
                          {post.author?.title || 'Professional'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTimeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Three Dots Menu - Made Clickable */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-50"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      
                      {/* Post Menu Dropdown */}
                      {showPostMenu === post.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="py-2">
                            {/* Dynamic Connection Option */}
                            {post.author?.id !== user?.id && (
                              <>
                                {isConnectedToAuthor(post.author?.id) ? (
                                  <button
                                    onClick={() => handleRemoveConnection(post.author?.id)}
                                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-sm flex items-center space-x-2"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                    <span>Remove Connection</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleConnect(post.author?.id)}
                                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-sm flex items-center space-x-2"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    <span>{getConnectionStatus(post.author?.id) === 'pending_sent' ? 'Cancel Request' : 'Connect'}</span>
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Not Interested Option */}
                            <button
                              onClick={() => handleNotInterested(post.id)}
                              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-sm flex items-center space-x-2"
                            >
                              <EyeOff className="h-4 w-4" />
                              <span>Not Interested</span>
                            </button>
                            
                            {/* ENHANCED: Save Post Option with persistent state */}
                            <button
                              onClick={() => handleBookmark(post.id)}
                              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-sm flex items-center space-x-2"
                            >
                              <Bookmark className={`h-4 w-4 ${userSaves[post.id] ? 'fill-current text-blue-600' : ''}`} />
                              <span>{userSaves[post.id] ? 'Unsave Post' : 'Save Post'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                  <p className="text-slate-800 leading-relaxed text-sm sm:text-base">
                    {post.content}
                  </p>
                </div>

                {/* Post Image/Video */}
                {post.image_url && (
                  <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                    <div className="bg-slate-50 rounded-lg overflow-hidden">
                      {(() => {
                        const imageUrl = post.image_url;
                        
                        const isVideo = imageUrl && (imageUrl.includes('video') || imageUrl.includes('.mp4') || imageUrl.includes('.mov'));
                        
                        return isVideo ? (
                          <video
                            src={imageUrl}
                            controls
                            className="w-full h-auto block"
                            style={{ 
                              maxWidth: '100%',
                              height: 'auto'
                            }}
                          />
                        ) : (
                          <img
                            src={imageUrl}
                            alt="Post content"
                            className="w-full h-auto block"
                            style={{ 
                              maxWidth: '100%',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Post Actions */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-center">
                    <div className="flex space-x-4 sm:space-x-6">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-1 sm:space-x-2 transition-colors ${
                          userLikes[post.id] ? 'text-red-600' : 'text-slate-500 hover:text-red-600'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${userLikes[post.id] ? 'fill-current' : ''}`} />
                        <span className="text-xs sm:text-sm font-medium">
                          {post.likes_count || 0}
                        </span>
                      </button>
                      <button 
                        onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                        className="flex items-center space-x-1 sm:space-x-2 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium">
                          {post.comments?.length || post.comments_count || 0}
                        </span>
                      </button>
                      {/* REMOVED: Share button - removed repost functionality */}
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                {showComments === post.id && (
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50">
                    {/* Existing Comments */}
                    <div className="space-y-3 sm:space-y-4 mb-4">
                      {(post.comments || []).map((comment: any) => (
                        <div key={comment.id} className="flex space-x-2 sm:space-x-3">
                          <img
                            src={comment.author?.avatar_url || 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'}
                            alt={comment.author?.full_name || 'User'}
                            className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-shrink-0"
                            onClick={() => onViewProfile(comment.author?.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-center space-x-2 mb-1">
                                <span 
                                  className="font-medium text-slate-900 text-sm cursor-pointer hover:text-blue-600 transition-colors truncate"
                                  onClick={() => onViewProfile(comment.author?.id)}
                                >
                                  {comment.author?.full_name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-slate-500">{formatTimeAgo(comment.created_at)}</span>
                              </div>
                              <p className="text-sm text-slate-700 break-words">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Comment */}
                    <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex space-x-2 sm:space-x-3">
                      <img
                        src="https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
                        alt="Your avatar"
                        className="w-8 h-8 rounded-full cursor-pointer flex-shrink-0"
                        onClick={() => user && onViewProfile(user.id)}
                      />
                      <div className="flex-1 flex space-x-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 sm:px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Choice Modal */}
      {showUploadChoice && pendingImageFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">How would you like to upload this image?</h3>
              <p className="text-slate-600 text-sm sm:text-base">Choose to upload the image as-is or crop it to fit your needs.</p>
            </div>

            {/* Image Preview */}
            <div className="mb-6">
              <img
                src={URL.createObjectURL(pendingImageFile)}
                alt="Upload preview"
                className="w-full h-36 sm:h-48 object-cover rounded-lg border border-slate-200"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handleUploadAsIs}
                className="w-full flex items-center justify-center space-x-3 p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <Upload className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                <div className="text-left">
                  <div className="font-medium text-slate-900 group-hover:text-blue-900">Upload as-is</div>
                  <div className="text-sm text-slate-600 group-hover:text-blue-700">Keep the original image size and quality</div>
                </div>
              </button>

              <button
                onClick={handleCropImage}
                className="w-full flex items-center justify-center space-x-3 p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <Crop className="h-5 w-5 text-slate-600 group-hover:text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-slate-900 group-hover:text-green-900">Crop & resize</div>
                  <div className="text-sm text-slate-600 group-hover:text-green-700">Adjust the image size and crop to fit perfectly</div>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowUploadChoice(false);
                  setPendingImageFile(null);
                }}
                className="text-slate-500 hover:text-slate-700 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper */}
      {showImageCropper && pendingImageFile && (
        <ImageCropper
          imageFile={pendingImageFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};

export default HomePage;