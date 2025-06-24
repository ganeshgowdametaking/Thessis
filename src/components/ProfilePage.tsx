import React, { useState, useEffect } from 'react';
import { User, MapPin, Briefcase, GraduationCap, Award, Users, MessageCircle, Edit3, Camera, Plus, X, Calendar, Building, Trash2 } from 'lucide-react';
import { profileService } from '../services/profileService';
import { postService } from '../services/postService';
import { connectionService } from '../services/connectionService';
import { useAuthContext } from '../contexts/AuthContext';
import ConnectionsModal from './ConnectionsModal';
import PostsModal from './PostsModal';

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

const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [showPostsModal, setShowPostsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    title: '',
    company: '',
    location: '',
    bio: '',
    profile_picture_url: '',
    experiences: [] as Experience[],
    education: [] as Education[],
    skills: [] as Skill[],
    achievements: [] as Achievement[],
  });
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [realCounts, setRealCounts] = useState({
    posts: 0,
    connections: 0,
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_picture_url: profile.avatar_url || '',
        experiences: profile.experiences || [],
        education: profile.education || [],
        skills: profile.skills || [],
        achievements: profile.achievements || [],
      });
    }
    loadRealCounts();
  }, [profile]);

  const loadRealCounts = async () => {
    try {
      const allPosts = await postService.getFeedPosts();
      const userPosts = allPosts.filter(post => post.author_id === user?.id);
      const connections = await connectionService.getConnections();
      const userConnections = connections.filter(conn =>
        (conn.requester_id === user?.id || conn.addressee_id === user?.id) && conn.status === 'accepted'
      );
      setRealCounts({
        posts: userPosts.length,
        connections: userConnections.length,
      });
    } catch (error) {
      console.error('Error loading real counts:', error);
      setRealCounts({ posts: 0, connections: 0 });
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePictureFile(file);
      setEditForm({ ...editForm, profile_picture_url: URL.createObjectURL(file) });
    }
  };

  const addItem = (section: keyof typeof editForm, newItem: any) => {
    setEditForm({
      ...editForm,
      [section]: Array.isArray(editForm[section]) ? [...editForm[section], { ...newItem, id: Date.now() }] : [{ ...newItem, id: Date.now() }],
    });
  };

  const updateItem = (section: keyof typeof editForm, id: number, updatedItem: any) => {
    setEditForm({
      ...editForm,
      [section]: Array.isArray(editForm[section]) ? editForm[section].map((item: any) => (item.id === id ? { ...item, ...updatedItem } : item)) : [],
    });
  };

  const deleteItem = (section: keyof typeof editForm, id: number) => {
    setEditForm({
      ...editForm,
      [section]: Array.isArray(editForm[section]) ? editForm[section].filter((item: any) => item.id !== id) : [],
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setSaveError('You must be logged in to update your profile.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const updates: any = {
        full_name: editForm.full_name,
        title: editForm.title,
        company: editForm.company,
        location: editForm.location,
        bio: editForm.bio,
        experiences: editForm.experiences,
        education: editForm.education,
        skills: editForm.skills,
        achievements: editForm.achievements,
      };

      // Handle profile picture file
      if (profilePictureFile) {
        const maxSizeMB = 5;
        if (profilePictureFile.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`Image file is too large. Maximum size is ${maxSizeMB}MB.`);
        }

        // Convert file to Base64 string
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(profilePictureFile);
        });

        updates.avatar_url = base64String; // Store Base64 in avatar_url
      }

      console.log('Submitting profile updates:', updates);

      await profileService.updateProfile(user.id, updates);
      await updateProfile({ ...profile, ...updates, avatar_url: updates.avatar_url });
      setIsEditing(false);
      setProfilePictureFile(null);
    } catch (error: any) {
      console.error('Profile update error:', {
        message: error.message,
        stack: error.stack,
      });
      const errorMessage =
        error.message.includes('network') || error.message.includes('fetch')
          ? 'Network error. Please check your connection and try again.'
          : `Failed to save changes: ${error.message || 'Unknown error'}. Please try again or contact support.`;
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
    setProfilePictureFile(null);
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_picture_url: profile.avatar_url || '',
        experiences: profile.experiences || [],
        education: profile.education || [],
        skills: profile.skills || [],
        achievements: profile.achievements || [],
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getProfilePicture = () => {
    if (editForm.profile_picture_url) {
      return editForm.profile_picture_url;
    }
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = user?.id ? user.id.charCodeAt(0) % colors.length : 0;
    const backgroundColor = colors[colorIndex];
    const initials = editForm.full_name
      ? editForm.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';
    const svg = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${backgroundColor}"/>
        <text x="75" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  if (!profile) {
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
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="flex justify-end p-4">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-2 font-medium"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          </div>
          <div className="px-8 pb-12">
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6">
                <img
                  src={getProfilePicture()}
                  alt={editForm.full_name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
                {profile.verified && (
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-slate-900">{editForm.full_name}</h1>
              <p className="text-xl text-slate-600 font-medium">{editForm.title || 'Professional'}</p>
              <p className="text-lg text-slate-500">{editForm.company || 'Company'}</p>
              <div className="flex items-center justify-center space-x-6 text-slate-500">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{editForm.location || 'Location'}</span>
                </div>
              </div>
              {isEditing ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  {editForm.bio ? (
                    <p className="text-slate-700 leading-relaxed max-w-2xl mx-auto whitespace-pre-line">{editForm.bio}</p>
                  ) : (
                    <button
                      className="text-blue-600 hover:underline text-sm"
                      onClick={() => setIsEditing(true)}
                    >
                      + Add a bio
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-col items-center justify-center mt-8 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-slate-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{realCounts.connections}</div>
                <div className="text-sm text-slate-500 font-medium">Connections</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-slate-600" />
                <span>Experience</span>
              </h2>
              <div className="space-y-6">
                {editForm.experiences.length > 0 ? (
                  editForm.experiences.map((exp) => (
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
                  ))
                ) : (
                  <p className="text-slate-500">No experiences added yet.</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-slate-600" />
                <span>Education</span>
              </h2>
              <div className="space-y-6">
                {Array.isArray(editForm.education) && editForm.education.length > 0 ? (
                  editForm.education.map((edu) => (
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
                  ))
                ) : (
                  <p className="text-slate-500">No education added yet.</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Skills</h2>
              <div className="space-y-4">
                {editForm.skills.length > 0 ? (
                  editForm.skills.map((skill) => (
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
                  ))
                ) : (
                  <p className="text-slate-500">No skills added yet.</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <Award className="h-5 w-5 text-slate-600" />
                <span>Achievements</span>
              </h2>
              <div className="space-y-4">
                {Array.isArray(editForm.achievements) && editForm.achievements.length > 0 ? (
                  editForm.achievements.map((achievement) => (
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
                  ))
                ) : (
                  <p className="text-slate-500">No achievements added yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
                <button
                  onClick={handleCancel}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isSaving}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-8">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                <div className="flex items-center space-x-4">
                  <img
                    src={getProfilePicture()}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border border-slate-300"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={isSaving}
                />
              </div>

              {/* Experiences */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Experience</label>
                  <button
                    type="button"
                    onClick={() =>
                      addItem('experiences', {
                        title: '',
                        company: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        current: false,
                        description: '',
                        logo: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                      })
                    }
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    disabled={isSaving}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
                {editForm.experiences.map((exp) => (
                  <div key={exp.id} className="border border-slate-200 rounded-lg p-4 mb-4 relative">
                    <button
                      type="button"
                      onClick={() => deleteItem('experiences', exp.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, title: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, company: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, location: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={exp.startDate}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, startDate: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={exp.endDate}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, endDate: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={exp.current || isSaving}
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })}
                          className="mr-2"
                          disabled={isSaving}
                        />
                        <label className="text-xs font-medium text-slate-700">Current</label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => updateItem('experiences', exp.id, { ...exp, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Education */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Education</label>
                  <button
                    type="button"
                    onClick={() =>
                      addItem('education', {
                        degree: '',
                        school: '',
                        startDate: '',
                        endDate: '',
                        description: '',
                        gpa: '',
                      })
                    }
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    disabled={isSaving}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
                {Array.isArray(editForm.education) ? editForm.education.map((edu) => (
                  <div key={edu.id} className="border border-slate-200 rounded-lg p-4 mb-4 relative">
                    <button
                      type="button"
                      onClick={() => deleteItem('education', edu.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Degree</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateItem('education', edu.id, { ...edu, degree: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">School</label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => updateItem('education', edu.id, { ...edu, school: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={edu.startDate}
                          onChange={(e) => updateItem('education', edu.id, { ...edu, startDate: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={edu.endDate}
                          onChange={(e) => updateItem('education', edu.id, { ...edu, endDate: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">GPA</label>
                        <input
                          type="text"
                          value={edu.gpa}
                          onChange={(e) => updateItem('education', edu.id, { ...edu, gpa: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                          value={edu.description}
                          onChange={(e) => updateItem('education', edu.id, { ...edu, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                )) : null}
              </div>

              {/* Skills */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Skills</label>
                  <button
                    type="button"
                    onClick={() =>
                      addItem('skills', {
                        name: '',
                        level: 50,
                        category: '',
                      })
                    }
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    disabled={isSaving}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
                {editForm.skills.map((skill) => (
                  <div key={skill.id} className="border border-slate-200 rounded-lg p-4 mb-4 relative">
                    <button
                      type="button"
                      onClick={() => deleteItem('skills', skill.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) => updateItem('skills', skill.id, { ...skill, name: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Level (0-100)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={skill.level}
                          onChange={(e) => updateItem('skills', skill.id, { ...skill, level: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={skill.category}
                          onChange={(e) => updateItem('skills', skill.id, { ...skill, category: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Achievements */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Achievements</label>
                  <button
                    type="button"
                    onClick={() =>
                      addItem('achievements', {
                        title: '',
                        organization: '',
                        date: '',
                        type: '',
                        description: '',
                      })
                    }
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    disabled={isSaving}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
                {Array.isArray(editForm.achievements) ? editForm.achievements.map((achievement) => (
                  <div key={achievement.id} className="border border-slate-200 rounded-lg p-4 mb-4 relative">
                    <button
                      type="button"
                      onClick={() => deleteItem('achievements', achievement.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={achievement.title}
                          onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, title: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Organization</label>
                        <input
                          type="text"
                          value={achievement.organization}
                          onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, organization: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={achievement.date}
                          onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, date: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                        <input
                          type="text"
                          value={achievement.type}
                          onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, type: e.target.value })}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                          value={achievement.description}
                          onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                )) : null}
              </div>

              {/* Feedback Messages */}
              {isSaving && <p className="text-blue-500 text-sm">Saving changes...</p>}
              {saveError && <p className="text-red-500 text-sm">{saveError}</p>}

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onViewProfile={(userId) => {
          setShowConnectionsModal(false);
        }}
      />
      <PostsModal
        isOpen={showPostsModal}
        onClose={() => setShowPostsModal(false)}
        onViewProfile={(userId) => {
          setShowPostsModal(false);
        }}
      />
    </div>
  );
};

export default ProfilePage;