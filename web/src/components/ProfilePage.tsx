import React, { useState, useEffect, useCallback } from 'react';
import { Edit3, Plus, X, Trash2, Share2, Pencil, BadgeCheck } from 'lucide-react';
import { jobTitles } from '../data/jobTitles';
import debounce from 'lodash.debounce';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { useAuthContext } from '../contexts/AuthContext';
import PostsModal from './PostsModal';
import LoadingSpinner from './LoadingSpinner';
import CountryPicker from './CountryPicker';
import ImageCropper from './ImageCropper';
import { ProfileTabs } from './ProfileTabs';
import { ProfileExperienceList } from './ProfileExperienceList';
import { ProfileEducationList } from './ProfileEducationList';
import { getNormalizedProfileSections, isBlankExperience, validateExperienceDates } from '../utils/profileSectionNormalization';

interface Experience {
  id: number | string;
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
  id: number | string;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  description: string;
  gpa: string;
}

interface Skill {
  id: number | string;
  name: string;
  level: number;
  category: string;
}

interface Achievement {
  id: number | string;
  title: string;
  organization: string;
  date: string;
  type: string;
  description: string;
}

const ProfilePage: React.FC = () => {
  const createClientItemId = () => Date.now() + Math.floor(Math.random() * 1000000);

  const { user, profile, updateProfile } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('experience');
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
  // Location autocomplete state
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(0);

  // Cropping state
  const [isCropping, setIsCropping] = useState(false);
  const [activeExperienceLocationId, setActiveExperienceLocationId] = useState<number | string | null>(null);
  const [activeExperienceTitleId, setActiveExperienceTitleId] = useState<number | string | null>(null);
  const [filteredJobTitles, setFilteredJobTitles] = useState<string[]>([]);
  const [tempImage, setTempImage] = useState<string | null>(null);


  useEffect(() => {
    if (profile) {
      const normalizedSections = getNormalizedProfileSections(profile);
      setEditForm({
        full_name: profile.full_name || '',
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_picture_url: profile.avatar_url || '',
        cover_image_url: profile.cover_image_url || '',
        experiences: normalizedSections.experiences as Experience[],
        education: normalizedSections.education as Education[],
        skills: normalizedSections.skills as Skill[],
        achievements: normalizedSections.achievements as Achievement[],
        country_code: profile.country_code || '',
        work_email: (profile as any).work_email || '',
        work_email_verified: (profile as any).work_email_verified || false,
      });
      setLocationQuery(profile.location || '');
    }
  }, [profile]);

  useEffect(() => {
    if (user?.id) {
      connectionService
        .getConnectionsForUser(user.id)
        .then((connections) => setConnectionsCount(connections.length))
        .catch(() => {
          // Keep the count at 0 silently on failure.
        });
    }
  }, [user?.id]);

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

  const handleExperienceLocationInput = (expId: number | string, value: string) => {
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

  const handleExperienceLocationSelect = (expId: number | string, suggestion: any) => {
    const displayName = suggestion.label || formatLocationSuggestion(suggestion);
    updateItem('experiences', expId, { location: displayName });
    setActiveExperienceLocationId(null);
    setLocationSuggestions([]);
  };

  const handleExperienceTitleInput = (expId: number | string, value: string) => {
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

  const handleExperienceTitleSelect = (expId: number | string, title: string) => {
    updateItem('experiences', expId, { title });
    setActiveExperienceTitleId(null);
    setFilteredJobTitles([]);
  };

  const handleDeleteAvatar = () => {
    setEditForm({ ...editForm, profile_picture_url: null as any });
    setProfilePictureFile(null);
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

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setEditForm((prev) => ({ ...prev, cover_image_url: previewUrl }));
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
    setTempImage(null);
  };

  const compressImageToDataURL = async (
    source: Blob,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to process image');

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', quality);
  };


  const addItem = (section: keyof typeof editForm, newItem: any) => {
    setEditForm((prev) => ({
      ...prev,
      [section]: Array.isArray(prev[section])
        ? [...prev[section], { ...newItem, id: createClientItemId() }]
        : [{ ...newItem, id: createClientItemId() }],
    }));
  };

  const updateItem = (section: keyof typeof editForm, id: number | string, updatedItem: any) => {
    setEditForm((prev) => ({
      ...prev,
      [section]: Array.isArray(prev[section])
        ? prev[section].map((item: any) => (String(item.id) === String(id) ? { ...item, ...updatedItem } : item))
        : [],
    }));
  };

  const deleteItem = (section: keyof typeof editForm, id: number | string) => {
    setEditForm((prev) => ({
      ...prev,
      [section]: Array.isArray(prev[section]) ? prev[section].filter((item: any) => String(item.id) !== String(id)) : [],
    }));
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

    // Validate experience dates (blank, untouched entries are exempt — they
    // get dropped below instead of blocking the save).
    const experienceDateError = validateExperienceDates(editForm.experiences);
    if (experienceDateError) {
      setSaveError(experienceDateError);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const normalizedSections = getNormalizedProfileSections({
        ...editForm,
        experiences: editForm.experiences.filter((exp) => !isBlankExperience(exp)),
      });

      const updates: any = {
        full_name: editForm.full_name,
        title: editForm.title,
        company: editForm.company,
        location: editForm.location,
        bio: editForm.bio,
        experiences: normalizedSections.experiences,
        education: normalizedSections.education,
        skills: normalizedSections.skills,
        achievements: normalizedSections.achievements,
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

        const base64String = await compressImageToDataURL(profilePictureFile, 512, 512, 0.82);

        updates.avatar_url = base64String; // Store Base64 in avatar_url
      }

      // Handle cover image file
      if (coverImageFile) {
        const maxSizeMB = 5;
        if (coverImageFile.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`Cover image is too large. Maximum size is ${maxSizeMB}MB.`);
        }

        const base64String = await compressImageToDataURL(coverImageFile, 1200, 400, 0.82);

        updates.cover_image_url = base64String;
      }

      console.log('Submitting profile updates:', updates);

      // We ONLY call updateProfile from AuthContext which handles both
      // the API call and the local post-update state refresh.
      await updateProfile(updates);

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
      const normalizedSections = getNormalizedProfileSections(profile);
      setEditForm({
        full_name: profile.full_name || '',
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_picture_url: profile.avatar_url || '',
        cover_image_url: profile.cover_image_url || '',
        experiences: normalizedSections.experiences as Experience[],
        education: normalizedSections.education as Education[],
        skills: normalizedSections.skills as Skill[],
        achievements: normalizedSections.achievements as Achievement[],
        country_code: profile.country_code || '',

        work_email: (profile as any).work_email || '',
        work_email_verified: (profile as any).work_email_verified || false,
      });
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const formatDateRange = (startDate?: string, endDate?: string, current?: boolean) => {
    const start = startDate ? formatDate(startDate) : '';
    const end = current ? 'Present' : (endDate ? formatDate(endDate) : '');

    if (start && end) return `${start} — ${end}`;
    if (start) return start;
    if (end) return end;
    return 'Date not set';
  };

  const timelineTextClass = 'text-slate-900 text-[11px] md:text-xs font-black uppercase tracking-wide whitespace-nowrap';

  const getMonogram = (label?: string) => {
    if (!label) return 'TT';
    return label
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'TT';
  };

  const getProfilePicture = () => {
    if (editForm.profile_picture_url?.trim()) {
      return editForm.profile_picture_url;
    }
    return '/default-avatar.svg';
  };

  const formatConnectionsCount = (count?: number) => {
    const value = typeof count === 'number' ? count : 0;
    if (value < 1000) return String(value);
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, '')}k`;
  };

  if (!profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="bg-stone-bg text-text-main font-display min-h-screen flex flex-col overflow-x-hidden antialiased">
      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 md:px-6 py-5 md:py-12">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr] gap-6 md:gap-8 items-start">
          {/* Left column: profile details — 40% */}
          <aside className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden lg:sticky lg:top-8">
            <div
              className="relative w-full h-24 bg-center bg-cover bg-no-repeat"
              style={{
                backgroundImage: editForm.cover_image_url
                  ? `url("${editForm.cover_image_url}")`
                  : 'linear-gradient(135deg, #4353FF 0%, #7C86FF 50%, #C7CCFF 100%)',
              }}
            >
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  onClick={() => setIsEditing(true)}
                  className="size-7 flex items-center justify-center bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-full transition-all transform hover:scale-110"
                  title="Edit Profile"
                >
                  <Pencil className="w-3.5 h-3.5 text-white fill-white" />
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
                  className="size-7 flex items-center justify-center bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-full transition-all transform hover:scale-110"
                  title="Share Profile"
                >
                  <Share2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-end gap-2.5 -mt-10">
                <div className="relative shrink-0">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-20 w-20 ring-4 ring-white shadow-sm"
                    style={{ backgroundImage: `url("${getProfilePicture()}")` }}
                  ></div>
                </div>
                <div className="pb-1">
                  <span className="text-text-main text-lg font-extrabold">{formatConnectionsCount(connectionsCount)}</span>{' '}
                  <span className="text-text-secondary text-sm font-medium">Connections</span>
                </div>
              </div>

              <h1 className="text-text-main text-lg font-extrabold leading-tight tracking-tight mt-2 flex items-center gap-1.5">
                {editForm.full_name || 'Your Name'}
                {profile?.verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500 stroke-white shrink-0" />
                )}
              </h1>

              {editForm.bio && (
                <p className="text-text-secondary text-sm leading-snug mt-1">
                  {editForm.bio}
                </p>
              )}

              <div className="flex flex-col gap-6 mt-6 text-left">
                {/* Skills Section */}
                <section>
                  <div className="flex items-center mb-3 pb-2 border-b border-slate-200/70">
                    <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.skills.length > 0 ? (
                      editForm.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="px-2.5 py-1.5 rounded-lg bg-white text-slate-body cursor-default text-[13px] font-bold tracking-tight border border-stone-border"
                        >
                          {skill.name}
                        </span>
                      ))
                    ) : null}
                  </div>
                </section>

                {/* Achievements Section */}
                <section>
                  <div className="flex items-center mb-3 pb-2 border-b border-slate-200/70">
                    <h2 className="text-lg font-semibold text-slate-900">Achievements</h2>
                  </div>
                  <div className="flex flex-col gap-1 divide-y divide-slate-200/80">
                    {Array.isArray(editForm.achievements) && editForm.achievements.length > 0 ? (
                      editForm.achievements.map((achievement) => (
                        <div key={achievement.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-text-main font-bold text-[1.05rem] leading-tight">{achievement.title}</h4>
                            <p className="text-slate-meta text-[13px] mt-1 font-semibold">{achievement.organization}</p>
                            {achievement.description?.trim() && (
                              <p className="text-text-secondary text-sm mt-1.5 leading-snug">{achievement.description}</p>
                            )}
                          </div>
                          <span className={`${timelineTextClass} shrink-0 pt-0.5`}>{formatDate(achievement.date)}</span>
                        </div>
                      ))
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          </aside>

          {/* Right column: tabbed detail content — 50% */}
          <div className="min-w-0 w-full bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <ProfileTabs
              tabs={[
                { id: 'experience', label: 'Experience' },
                { id: 'education', label: 'Education' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            <div className="mt-6 md:mt-10">

            {activeTab === 'experience' && (
              <section>
                <div className="flex items-center mb-3 md:mb-6 px-1 pb-2 border-b border-slate-200/70 md:border-b-0 md:pb-0">
                  <h2 className="text-2xl font-semibold text-slate-900">Experience</h2>
                </div>
                <ProfileExperienceList experiences={editForm.experiences} />
              </section>
            )}

            {activeTab === 'education' && (
              <section>
                <div className="flex items-center mb-3 md:mb-6 px-1 pb-2 border-b border-slate-200/70 md:border-b-0 md:pb-0">
                  <h2 className="text-2xl font-semibold text-slate-900">Education</h2>
                </div>
                <ProfileEducationList education={editForm.education} />
              </section>
            )}
          </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {
        isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-slate-200 bg-white">
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cover Banner</label>
                  <div
                    className="relative group w-full h-28 rounded-lg overflow-hidden bg-center bg-cover mb-2"
                    style={{
                      backgroundImage: editForm.cover_image_url
                        ? `url("${editForm.cover_image_url}")`
                        : 'linear-gradient(135deg, #4353FF 0%, #7C86FF 50%, #C7CCFF 100%)',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <Edit3 className="text-white h-5 w-5" />
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                    disabled={isSaving}
                  />
                </div>


                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                    <input
                      type="text"
                      value={editForm.company}
                      onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                      className={`w-full px-4 py-2 border ${locationError ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:outline-none focus:border-blue-500`}
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
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
                          logo: '',
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
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div className="relative">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={exp.location}
                            onChange={(e) => handleExperienceLocationInput(exp.id, e.target.value)}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                          <label className="block text-xs font-medium text-slate-700 mb-1">Start Date *</label>
                          <input
                            type="date"
                            value={exp.startDate}
                            onChange={(e) => updateItem('experiences', exp.id, { ...exp, startDate: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">End Date {!exp.current && '*'}</label>
                          <input
                            type="date"
                            value={exp.endDate}
                            onChange={(e) => updateItem('experiences', exp.id, { ...exp, endDate: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
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
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">School</label>
                          <input
                            type="text"
                            value={edu.school}
                            onChange={(e) => updateItem('education', edu.id, { ...edu, school: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={edu.startDate}
                            onChange={(e) => updateItem('education', edu.id, { ...edu, startDate: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={edu.endDate}
                            onChange={(e) => updateItem('education', edu.id, { ...edu, endDate: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">GPA</label>
                          <input
                            type="text"
                            value={edu.gpa}
                            onChange={(e) => updateItem('education', edu.id, { ...edu, gpa: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                          <textarea
                            value={edu.description}
                            onChange={(e) => updateItem('education', edu.id, { ...edu, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
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
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={skill.name}
                            onChange={(e) => updateItem('skills', skill.id, { ...skill, name: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Organization</label>
                          <input
                            type="text"
                            value={achievement.organization}
                            onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, organization: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                          <input
                            type="date"
                            value={achievement.date}
                            onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, date: e.target.value })}
                            className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
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
