import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Award, Users, Eye, MessageCircle, UserPlus, Mail, Phone, Globe, Linkedin, Github, Twitter, Star, Building, MoreVertical, Heart, Share2, Send, X } from 'lucide-react';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { postService } from '../services/postService';
import { messageService } from '../services/messageService';
import { useAuthContext } from '../contexts/AuthContext';
import ConnectionsModal from './ConnectionsModal';

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

interface Experience {
  id: number;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  logo: string;
}

interface Education {
  id: number;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  description: string;
  gpa: string;
}

interface Skill {
  id: number;
  name: string;
  level: number;
  category: string;
}

interface Achievement {
  id: number;
  title: string;
  organization: string;
  date: string;
  type: string;
  description: string;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, onBack, onViewProfile }) => {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('none');
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAllPostsModal, setShowAllPostsModal] = useState(false);
  const [userLikes, setUserLikes] = useState<Record<number, boolean>>({});
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [realCounts, setRealCounts] = useState({
    posts: 0,
    connections: 0
  });
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);

  // Use actual data from profile instead of hardcoded mock data
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadUserProfile();
    loadUserPosts();
    loadConnectionStatus();
    loadRealCounts();
    loadUserLikes();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const userProfile = await profileService.getProfile(userId);
      setProfile(userProfile);
      
      // Set the actual data from the user's profile
      setExperiences(userProfile.experiences || []);
      setEducation(userProfile.education || []);
      setSkills(userProfile.skills || []);
      setAchievements(userProfile.achievements || []);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserPosts = async () => {
    try {
      const allPosts = await postService.getFeedPosts();
      const userPosts = allPosts.filter(post => post && post.author_id === userId);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };

  const loadConnectionStatus = async () => {
    if (userId === user?.id) return; // Don't load connection status for own profile
    
    try {
      const status = await connectionService.getConnectionStatus(userId);
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error loading connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load real counts for posts and connections
  const loadRealCounts = async () => {
    try {
      // Load real posts count for this user
      const allPosts = await postService.getFeedPosts();
      const userPosts = allPosts.filter(post => post && post.author_id === userId);
      
      // Load real connections count for this user
      const connections = await connectionService.getConnections();
      const userConnections = connections.filter(conn => 
        conn && 
        conn.requester_id && 
        conn.addressee_id && 
        conn.status &&
        (conn.requester_id === userId || conn.addressee_id === userId) && 
        conn.status === 'accepted'
      );
      
      setRealCounts({
        posts: userPosts.length,
        connections: userConnections.length
      });
    } catch (error) {
      console.error('Error loading real counts:', error);
      // Keep default counts if loading fails
      setRealCounts({
        posts: 0,
        connections: 0
      });
    }
  };

  const loadUserLikes = async () => {
    try {
      const likes = await postService.getUserLikes();
      const likesMap: Record<number, boolean> = {};
      likes.forEach((like: any) => {
        likesMap[like.post_id] = true;
      });
      setUserLikes(likesMap);
    } catch (error) {
      console.error('Error loading user likes:', error);
      setUserLikes({});
    }
  };

  // ENHANCED: Handle like with duplicate handling
  const handleLike = async (postId: number) => {
    try {
      const isCurrentlyLiked = userLikes[postId] || false;
      
      if (isCurrentlyLiked) {
        await postService.removeUserLike(postId.toString());
        setUserLikes(prev => ({ ...prev, [postId]: false }));
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, likes_count: Math.max((post.likes_count || 0) - 1, 0) }
            : post
        ));
      } else {
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
    } catch (error) {
      console.error('Error toggling like:', error);
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

  const handleConnect = async () => {
    if (!user || userId === user.id) return;
    try {
      setConnectionLoading(true);
      if (connectionStatus === 'none') {
        await connectionService.sendConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        const status = await connectionService.forceRefreshConnectionStatus(userId);
        setConnectionStatus(status);
      } else if (connectionStatus === 'pending_sent') {
        await connectionService.cancelConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        const status = await connectionService.forceRefreshConnectionStatus(userId);
        setConnectionStatus(status);
      }
      // Removed the 'pending_received' case - users can only accept from notifications page
    } catch (error) {
      console.error('Error handling connection:', error);
      alert('Failed to update connection. Please try again.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || userId === user.id) return;

    try {
      // Create or get conversation with this user
      const conversation = await messageService.createOrGetConversation(userId);
      
      // Navigate to messages page with this conversation selected
      // We'll trigger the navigation through the parent component
      onBack(); // Go back first
      
      // Use a small delay to ensure navigation completes, then navigate to messages
      setTimeout(() => {
        // Trigger navigation to messages page
        window.dispatchEvent(new CustomEvent('navigate-to-messages', { 
          detail: { conversationId: conversation.id, userId: userId } 
        }));
      }, 100);
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to open conversation. Please try again.');
    }
  };

  const handleRemoveConnection = async () => {
    if (!user || userId === user.id) return;
    try {
      const connections = await connectionService.getConnections();
      const connection = connections.find(conn => 
        (conn.requester_id === userId && conn.addressee_id === user.id) ||
        (conn.requester_id === user.id && conn.addressee_id === userId)
      );
      if (connection) {
        await connectionService.cancelConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        const status = await connectionService.forceRefreshConnectionStatus(userId);
        setConnectionStatus(status);
        setShowActionsMenu(false);
        alert('Connection removed successfully');
      }
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Failed to remove connection. Please try again.');
    }
  };

  const handleBlock = () => {
    // TODO: Implement block functionality
    setShowActionsMenu(false);
    alert('Block functionality coming soon!');
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    setShowActionsMenu(false);
    alert('Report functionality coming soon!');
  };

  // Handle navigation to user posts page
  const handleViewUserPosts = () => {
    // TODO: Navigate to user posts page
    console.log('Navigate to user posts page');
    alert('User posts page coming soon!');
  };

  // Handle navigation to connections page
  const handleViewConnections = () => {
    // TODO: Navigate to connections page
    console.log('Navigate to connections page');
    alert('Connections page coming soon!');
  };

  const getConnectionButtonText = () => {
    if (connectionLoading) return 'Loading...';
    
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'pending_sent': return 'Cancel Request';
      case 'pending_received': return 'Request Sent';
      default: return 'Connect';
    }
  };

  const getConnectionButtonStyle = () => {
    if (connectionLoading) {
      return 'bg-slate-300 text-slate-600 cursor-not-allowed';
    }
    
    switch (connectionStatus) {
      case 'connected': 
        return 'bg-green-100 text-green-800 cursor-default';
      case 'pending_sent': 
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'pending_received': 
        return 'bg-slate-300 text-slate-600 cursor-not-allowed';
      default: 
        return 'bg-slate-900 text-white hover:bg-slate-800';
    }
  };

  // Helper function to get profile picture with fallback
  const getProfilePicture = (user: any) => {
    if (user?.avatar_url) {
      return user.avatar_url;
    }
    
    // Create a simple colored background based on user ID
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = user?.id ? user.id.charCodeAt(0) % colors.length : 0;
    const backgroundColor = colors[colorIndex];
    
    // Get initials
    const initials = user?.full_name
      ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';
    
    // Return a simple SVG data URL
    const svg = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${backgroundColor}"/>
        <text x="75" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
          {/* Back Button */}
          <div className="flex justify-start p-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all px-3 py-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>

          {/* Profile Info */}
          <div className="px-8 pb-12">
            {/* Avatar - Centered */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6">
                <img
                  src={getProfilePicture(profile)}
                  alt={profile.full_name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
                {profile.verified && (
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Data - Centered */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-slate-900">{profile.full_name || 'User'}</h1>
              <p className="text-xl text-slate-600 font-medium">{profile.title || 'Professional'}</p>
              <p className="text-lg text-slate-500">{profile.company || 'Company'}</p>
              
              {/* REMOVED: Joined date - only show location */}
              <div className="flex items-center justify-center space-x-6 text-slate-500">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location || 'Location'}</span>
                </div>
              </div>
              
              {profile.bio && (
                <p className="text-slate-700 leading-relaxed max-w-2xl mx-auto">{profile.bio}</p>
              )}

              {/* Action Buttons with Three Dots Menu */}
              {userId !== user?.id && (
                <div className="flex items-center justify-center space-x-4 pt-4">
                  <button
                    onClick={handleConnect}
                    disabled={connectionStatus === 'connected' || connectionStatus === 'pending_received' || connectionLoading}
                    className={`px-6 py-3 rounded-lg transition-colors font-medium flex items-center space-x-2 ${getConnectionButtonStyle()}`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{getConnectionButtonText()}</span>
                  </button>
                  <button 
                    onClick={handleMessage}
                    className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 transition-colors font-medium flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </button>
                  
                  {/* Three Dots Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="bg-slate-200 text-slate-700 p-3 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {showActionsMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="py-2">
                          {connectionStatus === 'connected' && (
                            <button
                              onClick={handleRemoveConnection}
                              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                            >
                              Remove Connection
                            </button>
                          )}
                          <button
                            onClick={handleBlock}
                            className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                          >
                            Block
                          </button>
                          <button
                            onClick={handleReport}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm"
                          >
                            Report
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats - Only Connections, Centered */}
              <div className="flex flex-col items-center justify-center pt-6 border-t border-slate-200 max-w-md mx-auto">
                <button
                  onClick={() => {
                    if (connectionStatus === 'connected') setShowConnectionsModal(true);
                  }}
                  className={`text-center p-4 rounded-lg transition-colors group ${connectionStatus === 'connected' ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  disabled={connectionStatus !== 'connected'}
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-slate-200 transition-colors">
                    <Users className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{realCounts.connections}</div>
                  <div className="text-sm text-slate-500 font-medium">Connections</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Experience */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-slate-600" />
                <span>Experience</span>
              </h2>
              <div className="space-y-6">
                {(Array.isArray(experiences) ? experiences : []).map((exp) => (
                  <div key={exp.id} className="flex space-x-4">
                    <img
                      src={exp.logo}
                      alt={exp.company}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{exp.title}</h3>
                      <p className="text-slate-600 font-medium">{exp.company}</p>
                      <p className="text-sm text-slate-500">
                        {exp.location} • {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                      </p>
                      <p className="text-slate-700 mt-2 leading-relaxed">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-slate-600" />
                <span>Education</span>
              </h2>
              <div className="space-y-6">
                {(Array.isArray(education) ? education : []).map((edu) => (
                  <div key={edu.id} className="flex space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                      <GraduationCap className="h-6 w-6 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{edu.degree}</h3>
                      <p className="text-slate-600 font-medium">{edu.school}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                        {edu.gpa && ` • GPA: ${edu.gpa}`}
                      </p>
                      <p className="text-slate-700 mt-2">{edu.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Posts Section - Enhanced with functional interactions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Posts</h2>
              
              {posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.slice(0, 2).map((post) => (
                    <div key={post.id} className="border border-slate-200 rounded-lg p-4">
                      {/* Post Header */}
                      <div className="flex items-start space-x-3 mb-3">
                        <img
                          src={getProfilePicture(profile)}
                          alt={profile.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-slate-900 text-sm">{profile.full_name}</h3>
                            {profile.verified && (
                              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{formatTimeAgo(post.created_at)}</p>
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="mb-3">
                        <p className="text-slate-800 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                      </div>

                      {/* Post Image */}
                      {post.image_url && (
                        <div className="mb-3">
                          <div className="bg-slate-50 rounded-lg overflow-hidden">
                            <img
                              src={post.image_url}
                              alt="Post content"
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* ENHANCED: Functional Post Stats */}
                      <div className="flex items-center space-x-4 text-xs text-slate-500 mb-3">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-1 transition-colors ${
                            userLikes[post.id] ? 'text-red-600' : 'text-slate-500 hover:text-red-600'
                          }`}
                        >
                          <Heart className={`h-3 w-3 ${userLikes[post.id] ? 'fill-current' : ''}`} />
                          <span>{post.likes_count || 0} likes</span>
                        </button>
                        <button
                          onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                          className="flex items-center space-x-1 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          <span>{post.comments_count || 0} comments</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {showComments === post.id && (
                        <div className="border-t border-slate-200 pt-3 mt-3">
                          {/* Existing Comments */}
                          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                            {(post.comments || []).map((comment: any) => (
                              <div key={comment.id} className="flex space-x-2">
                                <img
                                  src={getProfilePicture(comment.author)}
                                  alt={comment.author?.full_name || 'User'}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <div className="bg-slate-50 rounded-lg p-2">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-slate-900 text-xs">
                                        {comment.author?.full_name || 'Anonymous'}
                                      </span>
                                      <span className="text-xs text-slate-500">{formatTimeAgo(comment.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-slate-700">{comment.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Comment */}
                          <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex space-x-2">
                            <img
                              src={getProfilePicture(user)}
                              alt="Your avatar"
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div className="flex-1 flex space-x-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs"
                              />
                              <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="bg-slate-900 text-white px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="h-3 w-3" />
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* ENHANCED: Functional "More Posts" Link */}
                  {posts.length > 2 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setShowAllPostsModal(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                      >
                        {posts.length - 2} more posts available
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">No posts yet</h3>
                  <p className="text-slate-600 text-sm">This user hasn't shared any posts yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Skills */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Skills</h2>
              <div className="space-y-4">
                {(Array.isArray(skills) ? skills : []).map((skill) => (
                  <div key={skill.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900">{skill.name}</span>
                      <span className="text-xs text-slate-500">{skill.level}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-slate-900 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{skill.category}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <Award className="h-5 w-5 text-slate-600" />
                <span>Achievements</span>
              </h2>
              <div className="space-y-4">
                {(Array.isArray(achievements) ? achievements : []).map((achievement) => (
                  <div key={achievement.id} className="flex space-x-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                      <Award className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-sm">{achievement.title}</h3>
                      <p className="text-xs text-slate-600">{achievement.organization}</p>
                      <p className="text-xs text-slate-500">{formatDate(achievement.date)} • {achievement.type}</p>
                      {achievement.description && (
                        <p className="text-xs text-slate-700 mt-1">{achievement.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Posts Modal */}
      {showAllPostsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={getProfilePicture(profile)}
                    alt={profile.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{profile.full_name}'s Posts</h2>
                    <p className="text-slate-600">{posts.length} posts shared</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllPostsModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Posts List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.id} className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    {/* Post Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start space-x-3">
                        <img
                          src={getProfilePicture(profile)}
                          alt={profile.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-slate-900">{profile.full_name}</h3>
                            {profile.verified && (
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 font-medium">{profile.title}</p>
                          <p className="text-xs text-slate-500">{formatTimeAgo(post.created_at)}</p>
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

                    {/* Post Actions */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-white">
                      <div className="flex items-center space-x-6">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-2 transition-colors ${
                            userLikes[post.id] ? 'text-red-600' : 'text-slate-500 hover:text-red-600'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${userLikes[post.id] ? 'fill-current' : ''}`} />
                          <span className="text-sm font-medium">{post.likes_count || 0}</span>
                        </button>
                        <button 
                          onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                          className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{post.comments?.length || post.comments_count || 0}</span>
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {showComments === post.id && (
                      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                        {/* Existing Comments */}
                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                          {(post.comments || []).map((comment: any) => (
                            <div key={comment.id} className="flex space-x-3">
                              <img
                                src={getProfilePicture(comment.author)}
                                alt={comment.author?.full_name || 'User'}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-slate-900 text-sm">
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
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex-1 flex space-x-2">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Write a comment..."
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
            </div>
          </div>
        </div>
      )}

      <ConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onViewProfile={(userId) => {
          setShowConnectionsModal(false);
          onViewProfile(userId);
        }}
        userId={userId}
      />
    </div>
  );
};

export default UserProfilePage;