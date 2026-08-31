import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Send, MoreHorizontal, Trash2 } from 'lucide-react';
import shareIcon from '../assets/share-icon.png';
import { postService } from '../services/postService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface PostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

const PostsModal: React.FC<PostsModalProps> = ({ isOpen, onClose, onViewProfile }) => {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostMenu, setShowPostMenu] = useState<number | null>(null);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [shareSuccess, setShareSuccess] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUserPosts();
    }
  }, [isOpen]);

  const loadUserPosts = async () => {
    try {
      setLoading(true);
      const allPosts = await postService.getFeedPosts();
      const userPosts = allPosts.filter(post => post.author_id === user?.id);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading user posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await postService.deletePost(postId.toString());
      // Remove the post from local state
      setPosts(posts.filter(post => post.id !== postId));
      setShowPostMenu(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  // FIXED: Share post without popup - silent copy to clipboard
  const handleSharePost = async (postId: number) => {
    try {
      // Create a shareable URL for the post
      const postUrl = `${window.location.origin}/posts/${postId}`;

      // Copy to clipboard silently using the modern Clipboard API
      await navigator.clipboard.writeText(postUrl);

      // Show brief success indicator
      setShareSuccess(postId);
      setTimeout(() => setShareSuccess(null), 2000);

      // Optionally increment the share count in the database
      await postService.sharePost(postId.toString());

      // Update local state to reflect the new share count
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, shares_count: (post.shares_count || 0) + 1 }
          : post
      ));

      console.log('✅ Post URL copied to clipboard silently');
    } catch (error) {
      console.error('Error copying to clipboard:', error);

      // Fallback for browsers that don't support Clipboard API
      try {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = `${window.location.origin}/posts/${postId}`;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        // Use the older execCommand method
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setShareSuccess(postId);
          setTimeout(() => setShareSuccess(null), 2000);
          console.log('✅ Post URL copied using fallback method');
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackError) {
        console.error('Fallback copy method also failed:', fallbackError);
        // Only show alert as last resort
        alert('Unable to copy automatically. Please manually copy this URL: ' + `${window.location.origin}/posts/${postId}`);
      }
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
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

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

  const getProfilePicture = (author: any) => {
    if (author?.avatar_url) {
      return author.avatar_url;
    }

    return '/default-avatar.svg';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Posts</h2>
                <p className="text-slate-600">{posts.length} posts shared</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Posts List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingSpinner text="Loading posts..." />
          ) : posts.length > 0 ? (
            <div className="space-y-6 p-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Post Header with 3-dot menu */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <img
                          src={getProfilePicture(post.author)}
                          alt={post.author?.full_name || 'User'}
                          className="w-12 h-12 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => onViewProfile(post.author?.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3
                              className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => onViewProfile(post.author?.id)}
                            >
                              {post.author?.full_name || 'Anonymous User'}
                            </h3>
                            {post.author?.verified && (
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 font-medium">
                            {post.author?.title || 'Professional'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatTimeAgo(post.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* 3-dot menu with delete option */}
                      <div className="relative">
                        <button
                          onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {showPostMenu === post.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="py-2">
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm flex items-center space-x-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete Post</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-6 pb-4">
                    <p className="text-slate-800 leading-relaxed">{post.content}</p>
                  </div>

                  {/* Post Image */}
                  {post.image_url && (
                    <div className="px-6 pb-4">
                      <div className="bg-slate-100 rounded-lg overflow-hidden">
                        <img
                          src={post.image_url}
                          alt="Post content"
                          className="w-full h-auto block"
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* FIXED: Small Share Icon - Bottom Left with success feedback */}
                  <div className="px-6 py-4 border-t border-slate-200 bg-white">
                    <div className="flex items-center justify-start">
                      <button
                        onClick={() => handleSharePost(post.id)}
                        className="flex items-center space-x-1 p-2 transition-all group"
                        title="Share post"
                      >
                        <img
                          src={shareIcon}
                          alt="Share"
                          className="h-4 w-4 object-contain transition-all duration-200 group-hover:scale-110"
                        />
                        <span className={`text-sm ${shareSuccess === post.id ? 'text-green-600' : 'text-slate-500'
                          }`}>
                          {shareSuccess === post.id ? 'Copied!' : 'Share'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Section - Still functional */}
                  {showComments === post.id && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                      {/* Existing Comments */}
                      <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                        {(post.comments || []).map((comment: any) => (
                          <div key={comment.id} className="flex space-x-3">
                            <img
                              src={getProfilePicture(comment.author)}
                              alt={comment.author?.full_name || 'User'}
                              className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                              onClick={() => onViewProfile(comment.author?.id)}
                            />
                            <div className="flex-1">
                              <div className="bg-white rounded-lg p-3 border border-slate-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span
                                    className="font-medium text-slate-900 text-sm cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={() => onViewProfile(comment.author?.id)}
                                  >
                                    {comment.author?.full_name || 'Anonymous'}
                                  </span>
                                  <span className="text-xs text-slate-500">{formatTimeAgo(comment.created_at)}</span>
                                </div>
                                <p className="text-sm text-slate-700">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Comment */}
                      <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex space-x-3">
                        <img
                          src={getProfilePicture(user)}
                          alt="Your avatar"
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1 flex space-x-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No posts yet</h3>
              <p className="text-slate-600">
                You haven't shared any posts yet. Start sharing your professional insights!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostsModal;