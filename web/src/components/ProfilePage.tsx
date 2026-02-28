import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Briefcase, Building, GraduationCap, Award, Edit3, Plus, X, Trash2, Waves, Share2, Pencil } from 'lucide-react';
import { jobTitles } from '../data/jobTitles';
import debounce from 'lodash.debounce';
import { profileService } from '../services/profileService';
import { postService } from '../services/postService';
import { connectionService } from '../services/connectionService';
import { tidePointsService } from '../services/tidePointsService';
import { useAuthContext } from '../contexts/AuthContext';
import ConnectionsModal from './ConnectionsModal';
import PostsModal from './PostsModal';
import LoadingSpinner from './LoadingSpinner';
import CountryPicker from './CountryPicker';
import { iso2ToIso3 } from '../utils/countryMapping';
import ImageCropper from './ImageCropper';
import { TalentScoutBadge } from './TalentScoutBadge';
import { hireVerificationService, UserBadge } from '../services/hireVerificationService';

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
    cover_image_url: '',
    experiences: [] as Experience[],
    education: [] as Education[],
    skills: [] as Skill[],
    achievements: [] as Achievement[],
    country_code: '',
    work_email: '',
    work_email_verified: false,
  });
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [realCounts, setRealCounts] = useState({
    posts: 0,
    connections: 0,
    expYears: 0,
    rating: 5.0,
    tidePoints: 0,
  });
  const [badges, setBadges] = useState<UserBadge[]>([]);

  // Location autocomplete state
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Cropping state
  const [isCropping, setIsCropping] = useState(false);
  const [activeExperienceLocationId, setActiveExperienceLocationId] = useState<number | null>(null);
  const [activeExperienceTitleId, setActiveExperienceTitleId] = useState<number | null>(null);
  const [filteredJobTitles, setFilteredJobTitles] = useState<string[]>([]);
  const [isCroppingCover, setIsCroppingCover] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);


  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_picture_url: profile.avatar_url || '',
        cover_image_url: profile.cover_image_url || '',
        experiences: profile.experiences || [],
        education: profile.education || [],
        skills: profile.skills || [],
        achievements: profile.achievements || [],
        country_code: profile.country_code || '',
        work_email: (profile as any).work_email || '',
        work_email_verified: (profile as any).work_email_verified || false,
      });
      setLocationQuery(profile.location || '');
      // If country_code is missing, try to auto-detect
      if (!profile.country_code) {
        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(data => {
            if (data && data.country_code) {
              const iso3 = iso2ToIso3(data.country_code);
              if (iso3) {
                setEditForm(form => ({ ...form, country_code: iso3 }));
              }
            }
          })
          .catch(() => { });
      }
    }
    loadRealCounts();
  }, [profile]);

  const formatLocationSuggestion = (suggestion: any): string => {
    const address = suggestion.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state_district ||
      '';
    const state = address.state || '';
    const country = address.country || '';

    const compact = [city, state, country].filter(Boolean).join(', ');
    return compact || suggestion.display_name || suggestion.place_name || '';
  };

  // Debounced fetch for location suggestions
  const fetchLocationSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setLocationSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`
        );
        const data = await response.json();
        const normalized = Array.isArray(data)
          ? data.map((item: any) => ({
            ...item,
            label: formatLocationSuggestion(item),
          })).filter((item: any) => Boolean(item.label))
          : [];
        setLocationSuggestions(normalized);
      } catch (error) {
        setLocationSuggestions([]);
      }
    }, 300),
    []
  );

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationQuery(value);
    setLocationError('');
    setShowLocationSuggestions(true);
    setActiveExperienceLocationId(null); // Reset experience search
    setActiveExperienceTitleId(null); // Reset title search
    if (value) {
      fetchLocationSuggestions(value);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleLocationSelect = (suggestion: any) => {
    const displayName = suggestion.label || formatLocationSuggestion(suggestion);
    setEditForm({ ...editForm, location: displayName });
    setLocationQuery(displayName);
    setShowLocationSuggestions(false);
    setLocationError('');
  };

  const handleExperienceLocationInput = (expId: number, value: string) => {
    updateItem('experiences', expId, { location: value });
    setActiveExperienceLocationId(expId);
    setActiveExperienceTitleId(null); // Reset title search
    setShowLocationSuggestions(false); // Reset main search
    if (value) {
      fetchLocationSuggestions(value);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleExperienceLocationSelect = (expId: number, suggestion: any) => {
    const displayName = suggestion.label || formatLocationSuggestion(suggestion);
    updateItem('experiences', expId, { location: displayName });
    setActiveExperienceLocationId(null);
    setLocationSuggestions([]);
  };

  const handleExperienceTitleInput = (expId: number, value: string) => {
    updateItem('experiences', expId, { title: value });
    setActiveExperienceTitleId(expId);
    setActiveExperienceLocationId(null); // Reset location search
    setShowLocationSuggestions(false); // Reset main search

    if (value.trim()) {
      const filtered = jobTitles
        .filter((t: string) => t.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredJobTitles(filtered);
    } else {
      setFilteredJobTitles([]);
    }
  };

  const handleExperienceTitleSelect = (expId: number, title: string) => {
    updateItem('experiences', expId, { title });
    setActiveExperienceTitleId(null);
    setFilteredJobTitles([]);
  };

  const handleDeleteAvatar = () => {
    setEditForm({ ...editForm, profile_picture_url: null as any });
    setProfilePictureFile(null);
  };

  const handleDeleteCover = () => {
    setEditForm({ ...editForm, cover_image_url: null as any });
    setCoverImageFile(null);
  };

  const validateLocation = () => {
    if (!locationQuery.trim()) {
      setLocationError('Location is required');
      return false;
    }
    setLocationError('');
    return true;
  };

  const validateExperienceLocations = () => {
    for (const exp of editForm.experiences) {
      if (exp.location && exp.location.trim().length < 2) {
        return false;
      }
    }
    return true;
  };

  const loadRealCounts = async () => {
    try {
      // 1. Get real counts for posts and connections
      const allPosts: any[] = await postService.getFeedPosts();
      const userPosts = allPosts.filter((post: any) => post.author_id === user?.id);
      const connections: any[] = await connectionService.getConnections();
      const userConnections = connections.filter((conn: any) =>
        (conn.requester_id === user?.id || conn.addressee_id === user?.id) && conn.status === 'accepted'
      );

      // 2. Calculate experience years from the profile's experiences array
      let totalMonths = 0;
      const experiencesToUse = profile?.experiences || [];

      experiencesToUse.forEach((exp: Experience) => {
        if (exp.startDate) {
          const start = new Date(exp.startDate);
          const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());

          // Calculate difference in months
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          totalMonths += Math.max(0, months);
        }
      });

      const expYears = Math.floor(totalMonths / 12);

      // 3. Calculate a "Rating" score based on activity to make it feel dynamic
      // Starts at 4.5, grows with activity up to 5.0
      const baseRating = 4.5;
      const activityScore = (userConnections.length * 0.1) + (userPosts.length * 0.05);
      const rating = Math.min(5.0, baseRating + activityScore).toFixed(1);

      setRealCounts({
        posts: userPosts.length,
        connections: userConnections.length,
        expYears,
        rating: parseFloat(rating),
        tidePoints: await tidePointsService.getPointsBalance(user?.id || '')
      });

      // 4. Fetch Badges
      if (profile?.id) {
        const userBadges = await hireVerificationService.getUserBadges(profile.id);
        setBadges(userBadges);
      }

    } catch (error) {
      console.error('Error loading real counts:', error);
      setRealCounts({ posts: 0, connections: 0, expYears: 0, rating: 4.5, tidePoints: 0 });
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
      // Reset target value to allow selecting same file again
      e.target.value = '';
    }
  };

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'profile_picture.jpg', { type: 'image/jpeg' });
    const croppedUrl = URL.createObjectURL(croppedBlob);

    setProfilePictureFile(croppedFile);
    setEditForm(prev => ({ ...prev, profile_picture_url: croppedUrl }));
    setIsCropping(false);
    setTempImage(null);
  }, []);

  const handleCropCancel = () => {
    setIsCropping(false);
    setIsCroppingCover(false);
    setTempImage(null);
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
        setIsCroppingCover(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCoverCropComplete = useCallback((croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'cover_image.jpg', { type: 'image/jpeg' });
    const croppedUrl = URL.createObjectURL(croppedBlob);

    setCoverImageFile(croppedFile);
    setEditForm(prev => ({ ...prev, cover_image_url: croppedUrl }));
    setIsCroppingCover(false);
    setTempImage(null);
  }, []);


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

    // Validate location
    if (!validateLocation()) {
      return;
    }

    // Validate experience locations
    if (!validateExperienceLocations()) {
      setSaveError('Please enter valid locations for all experience entries.');
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
        country_code: editForm.country_code,
        avatar_url: editForm.profile_picture_url || null,
        cover_image_url: editForm.cover_image_url || null,
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

      // Handle cover image file
      if (coverImageFile) {
        const maxSizeMB = 10; // Allow slightly larger for cover
        if (coverImageFile.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`Cover image file is too large. Maximum size is ${maxSizeMB}MB.`);
        }

        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(coverImageFile);
        });

        updates.cover_image_url = base64String;
      }

      console.log('Submitting profile updates:', updates);

      await profileService.updateProfile(user.id, updates);
      await updateProfile({
        ...profile, ...updates
      });
      setIsEditing(false);
      setProfilePictureFile(null);
      setCoverImageFile(null);
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
    setCoverImageFile(null);
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_picture_url: profile.avatar_url || '',
        cover_image_url: profile.cover_image_url || '',
        experiences: profile.experiences || [],
        education: profile.education || [],
        skills: profile.skills || [],
        achievements: profile.achievements || [],
        country_code: profile.country_code || '',

        work_email: (profile as any).work_email || '',
        work_email_verified: (profile as any).work_email_verified || false,
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
    return <LoadingSpinner text="Loading profile..." />;
  }

  return (
    <div className="bg-stone-bg text-text-main font-display min-h-screen flex flex-col overflow-x-hidden antialiased">
      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1024px] mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-8">
        {/* Profile Header Section */}
        <section className="w-full bg-white rounded-2xl border border-slate-border-card shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex flex-col items-center relative overflow-hidden group">
          <div
            className="absolute top-0 left-0 w-full h-44 bg-cover bg-center"
            style={profile?.cover_image_url ? { backgroundImage: `url("${profile.cover_image_url}")` } : {}}
          >
            {!profile?.cover_image_url && (
              <div className="absolute inset-0 bg-gradient-to-br from-stone-off via-stone-border to-slate-200"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>

            {/* Cover Photo Icons */}
            <div className="absolute top-4 right-4 flex gap-4 z-20">
              <button
                onClick={() => setIsEditing(true)}
                className="size-8 flex items-center justify-center bg-[#5F7261] rounded-full transition-all transform hover:scale-110 shadow-sm"
                title="Edit Cover"
              >
                <Pencil className="w-4 h-4 text-white fill-white" />
              </button>
              <button
                onClick={() => {
                  const profileUrl = `${window.location.origin}/user/${user?.id}`;
                  navigator.clipboard.writeText(profileUrl).then(() => {
                    setShareSuccess(true);
                    setShowShareModal(true);
                    setTimeout(() => {
                      setShowShareModal(false);
                      setShareSuccess(false);
                    }, 2000);
                  });
                }}
                className="size-8 flex items-center justify-center bg-[#5F7261] rounded-full transition-all transform hover:scale-110 shadow-sm"
                title="Share Profile"
              >
                <Share2 className="w-4 h-4 text-white" strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-2xl mt-28 mb-10">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-sage-green/20 to-transparent blur-xl opacity-50"></div>
              <div
                className="relative bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-4 border-white shadow-xl"
                style={{ backgroundImage: `url("${getProfilePicture()}")` }}
              ></div>
              <div className="absolute bottom-1 right-1 bg-emerald-500 border-[3px] border-white size-6 rounded-full shadow-sm" title="Online"></div>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <h1 className="text-text-main text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
                {editForm.full_name || 'Your Name'}
              </h1>
              <p className="text-text-secondary text-lg md:text-xl font-medium max-w-lg leading-relaxed">
                {editForm.title || 'Professional Title'} {editForm.company && `at ${editForm.company}`}
              </p>
              <div className="flex items-center gap-2 text-slate-meta mt-1 text-sm font-medium">
                <MapPin className="text-[18px]" />
                <span>{editForm.location || 'Location'}</span>
              </div>

              {/* Badges Section */}
              {badges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-3 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {badges.map(badge => (
                    <TalentScoutBadge
                      key={badge.id}
                      type={badge.badge_type}
                      metadata={badge.metadata}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-8 w-full border-y border-slate-border-divider py-5 my-2">
              <div className="flex flex-col items-center px-4">
                <span className="text-text-main text-xl font-bold">{realCounts.connections}</span>
                <span className="text-slate-meta text-xs uppercase tracking-wider font-bold">Connections</span>
              </div>
              <div className="w-px bg-slate-border-divider h-10 self-center"></div>

              {/* Tide Points */}
              <div className="flex flex-col items-center px-4 group/points relative cursor-help">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-main text-xl font-bold">{realCounts.tidePoints}</span>
                  <Waves className="w-4 h-4 text-teal-500" />
                </div>
                <span className="text-slate-meta text-xs uppercase tracking-wider font-bold">Tide Pts</span>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/points:opacity-100 group-hover/points:visible transition-all z-20 text-center shadow-xl">
                  Social Capital<br />
                  <span className="opacity-75">Earn points by verifying skills & responding fast.</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                </div>
              </div>

              <div className="w-px bg-slate-border-divider h-10 self-center"></div>
              <div className="flex flex-col items-center px-4">
                <span className="text-text-main text-xl font-bold">{realCounts.rating.toFixed(1)}/5</span>
                <span className="text-slate-meta text-xs uppercase tracking-wider font-bold">Rating</span>
              </div>
              <div className="w-px bg-slate-border-divider h-10 self-center"></div>
              <div className="flex flex-col items-center px-4">
                <span className="text-text-main text-xl font-bold">{realCounts.expYears}yr</span>
                <span className="text-slate-meta text-xs uppercase tracking-wider font-bold">Exp</span>
              </div>
            </div>


            {/* Bio Section */}
            {editForm.bio && (
              <div className="mt-4 text-center">
                <p className="text-slate-700 leading-relaxed max-w-2xl mx-auto whitespace-pre-line">{editForm.bio}</p>
              </div>
            )}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-10">
            {/* Experience Section */}
            <section>
              <div className="flex items-center gap-3 mb-10 px-1">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                  <Briefcase size={20} />
                </div>
                <h2 className="text-slate-900 text-lg font-black uppercase tracking-[0.2em] pt-0.5">Experience</h2>
              </div>

              <div className="relative space-y-20 pl-2">
                {editForm.experiences.length > 0 && (
                  <div className="absolute left-[31px] top-6 bottom-6 w-px bg-slate-100"></div>
                )}
                {editForm.experiences.length > 0 ? (
                  editForm.experiences.map((exp) => (
                    <div key={exp.id} className="relative flex gap-10 group">
                      <div className="relative z-10 shrink-0">
                        <div className="bg-center bg-no-repeat bg-contain bg-white rounded-xl size-20 shadow-sm border border-slate-100 p-2">
                          <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                            {exp.logo ? (
                              <img src={exp.logo} alt={exp.company} className="w-full h-full object-contain p-1" />
                            ) : (
                              <Building className="h-8 w-8 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 pt-1">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                          <div className="flex flex-col gap-1.5">
                            <h3 className="text-slate-900 text-base font-black uppercase tracking-[0.1em] leading-tight group-hover:text-sage transition-colors duration-300">
                              {exp.title}
                            </h3>
                            <div className="flex items-center gap-2.5">
                              <span className="text-sage font-bold text-[10px] uppercase tracking-wider">{exp.company}</span>
                              {exp.location && (
                                <>
                                  <span className="text-slate-200 text-xs">/</span>
                                  <span className="text-slate-400 text-xs font-semibold tracking-tight">{exp.location}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 pt-0.5">
                            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                              {formatDate(exp.startDate)} — {exp.current ? 'Present' : formatDate(exp.endDate)}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-500 text-[14px] leading-[1.8] mt-6 max-w-2xl font-medium opacity-80 group-hover:opacity-100 transition-opacity duration-500 whitespace-pre-line">
                          {exp.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-slate-400 text-sm font-medium">No professional highlights added yet.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Education Section */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-1">
                <div className="p-1.5 bg-off-stone rounded-md text-slate-meta">
                  <GraduationCap className="text-2xl" />
                </div>
                <h2 className="text-text-main text-xl font-bold tracking-tight">Education</h2>
              </div>
              <div className="bg-white rounded-2xl border border-slate-border-card p-6 md:p-8 shadow-sm">
                <div className="relative space-y-10">
                  {Array.isArray(editForm.education) && editForm.education.length > 0 && (
                    <div className="absolute left-[27px] top-3 bottom-3 w-0.5 bg-off-stone"></div>
                  )}
                  {Array.isArray(editForm.education) && editForm.education.length > 0 ? (
                    editForm.education.map((edu) => (
                      <div key={edu.id} className="relative flex gap-6 group">
                        <div className="relative z-10 shrink-0">
                          <div className="size-[54px] rounded-full bg-white border border-stone-border flex items-center justify-center text-slate-meta group-hover:text-sage-green group-hover:border-sage-green transition-colors">
                            <GraduationCap />
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 pt-2">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-1">
                            <h3 className="text-text-main text-lg font-bold">{edu.degree}</h3>
                            <span className="text-slate-meta text-sm font-medium">{formatDate(edu.endDate)}</span>
                          </div>
                          <p className="text-text-secondary text-base">{edu.school}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No education added yet.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-8">
            {/* Skills Section */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-1">
                <div className="p-1.5 bg-off-stone rounded-md text-slate-meta">
                  <Award className="text-2xl" />
                </div>
                <h2 className="text-text-main text-xl font-bold tracking-tight">Skills</h2>
              </div>
              <div className="bg-white rounded-2xl border border-slate-border-card p-6 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {editForm.skills.length > 0 ? (
                    editForm.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-3 py-1.5 rounded-md bg-white text-slate-body hover:bg-sage-green/10 hover:text-sage-green cursor-default text-sm font-bold tracking-wide transition-colors border border-stone-border"
                      >
                        {skill.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500">No skills added yet.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Achievements Section */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-1">
                <div className="p-1.5 bg-off-stone rounded-md text-slate-meta">
                  <Award className="text-2xl" />
                </div>
                <h2 className="text-text-main text-xl font-bold tracking-tight">Achievements</h2>
              </div>
              <div className="flex flex-col gap-4">
                {Array.isArray(editForm.achievements) && editForm.achievements.length > 0 ? (
                  editForm.achievements.map((achievement) => (
                    <div key={achievement.id} className="bg-white rounded-2xl border border-slate-border-card p-5 flex gap-4 items-start hover:border-sage-green/50 hover:shadow-sm transition-all cursor-default shadow-sm">
                      <div className="bg-off-stone border border-stone-border text-slate-meta p-2.5 rounded-lg shrink-0">
                        <Award />
                      </div>
                      <div>
                        <h4 className="text-text-main font-bold text-base leading-tight">{achievement.title}</h4>
                        <p className="text-slate-meta text-xs mt-1 font-bold uppercase tracking-wider">
                          {achievement.organization} • {formatDate(achievement.date)}
                        </p>
                        <p className="text-text-secondary text-sm mt-2 leading-snug">{achievement.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-border-card p-5 shadow-sm">
                    <p className="text-slate-500">No achievements added yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {
        isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-slate-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Edit Profile</h2>
                  <button
                    onClick={handleCancel}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                    disabled={isSaving}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleEditSubmit} className="p-8 space-y-8">
                {/* Profile Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Profile Picture */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative group">
                          <img
                            src={getProfilePicture()}
                            alt="Preview"
                            className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                            <Edit3 className="text-white h-5 w-5" />
                          </div>
                        </div>
                        {editForm.profile_picture_url && (
                          <button
                            type="button"
                            onClick={handleDeleteAvatar}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                            disabled={isSaving}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cover Image (Background)</label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="relative group">
                          <div
                            className="h-20 w-full rounded-lg bg-cover bg-center border-2 border-slate-200 shadow-sm overflow-hidden bg-gradient-to-br from-stone-off via-stone-border to-slate-200"
                            style={editForm.cover_image_url ? { backgroundImage: `url("${editForm.cover_image_url}")` } : {}}
                          >
                          </div>
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                            <Edit3 className="text-white h-5 w-5" />
                          </div>
                        </div>
                        {editForm.cover_image_url && (
                          <button
                            type="button"
                            onClick={handleDeleteCover}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors w-fit"
                            disabled={isSaving}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Cover
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                        disabled={isSaving}
                      />
                    </div>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                    <CountryPicker
                      value={editForm.country_code}
                      onChange={val => setEditForm({ ...editForm, country_code: val })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={handleLocationInput}
                      onBlur={() => {
                        setLocationTouched(true);
                        setTimeout(() => setShowLocationSuggestions(false), 200);
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      className={`w-full px-4 py-2 border ${locationError ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Type a city, state, or country..."
                      disabled={isSaving}
                      autoComplete="off"
                    />
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <ul className="absolute z-10 bg-white border border-slate-200 rounded-lg mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
                        {locationSuggestions.map((suggestion) => (
                          <li
                            key={suggestion.place_id}
                            className="px-4 py-2 cursor-pointer hover:bg-blue-100"
                            onMouseDown={() => handleLocationSelect(suggestion)}
                          >
                            {suggestion.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    {locationError && locationTouched && (
                      <p className="text-red-600 text-xs mt-1">{locationError}</p>
                    )}
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
                        <div className="relative">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={exp.title}
                            onChange={(e) => handleExperienceTitleInput(exp.id, e.target.value)}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSaving}
                            autoComplete="off"
                          />
                          {activeExperienceTitleId === exp.id && filteredJobTitles.length > 0 && (
                            <ul className="absolute z-10 bg-white border border-slate-200 rounded-lg mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
                              {filteredJobTitles.map((title, idx) => (
                                <li
                                  key={idx}
                                  className="px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-100"
                                  onMouseDown={() => handleExperienceTitleSelect(exp.id, title)}
                                >
                                  {title}
                                </li>
                              ))}
                            </ul>
                          )}
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
                        <div className="relative">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={exp.location}
                            onChange={(e) => handleExperienceLocationInput(exp.id, e.target.value)}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type a city, state, or country..."
                            disabled={isSaving}
                            autoComplete="off"
                          />
                          {activeExperienceLocationId === exp.id && locationSuggestions.length > 0 && (
                            <ul className="absolute z-10 bg-white border border-slate-200 rounded-lg mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
                              {locationSuggestions.map((suggestion) => (
                                <li
                                  key={suggestion.place_id}
                                  className="px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-100"
                                  onMouseDown={() => handleExperienceLocationSelect(exp.id, suggestion)}
                                >
                                  {suggestion.label}
                                </li>
                              ))}
                            </ul>
                          )}
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
          </div >
        )
      }

      {/* Share Success Modal */}
      {
        showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl">
              <div className="mb-4">
                {shareSuccess ? (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {shareSuccess ? 'Link Copied!' : 'Copy Failed'}
              </h3>
              <p className="text-slate-600 text-sm">
                {shareSuccess
                  ? 'Profile link has been copied to your clipboard.'
                  : 'Failed to copy link. Please try again.'
                }
              </p>
            </div>
          </div>
        )
      }

      {/* Connections Modal */}
      <ConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onViewProfile={() => setShowConnectionsModal(false)}
        userId={profile?.id || user?.id || ''}
      />

      {/* Image Cropper Modals */}
      {
        isCropping && tempImage && (
          <ImageCropper
            image={tempImage}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            aspect={1}
            cropShape="round"
            title="Crop Profile Picture"
          />
        )
      }

      {
        isCroppingCover && tempImage && (
          <ImageCropper
            image={tempImage}
            onCropComplete={handleCoverCropComplete}
            onCancel={handleCropCancel}
            aspect={3 / 1}
            cropShape="rect"
            title="Crop Cover Image"
          />
        )
      }
      <PostsModal
        isOpen={showPostsModal}
        onClose={() => setShowPostsModal(false)}
        onViewProfile={() => {
          setShowPostsModal(false);
        }}
      />
    </div >
  );
};

export default ProfilePage;
