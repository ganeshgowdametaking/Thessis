import { useMediaQuery } from 'react-responsive';
import { usePhoneViewport } from '../hooks/usePhoneViewport';
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, BadgeCheck, Camera, Check, ChevronDown, Loader2, MapPin, Pencil, Plus, Share2, Trash2, Trophy, Users, X } from 'lucide-react';
import { jobTitles } from '../data/jobTitles';
import countries from 'world-countries';
import debounce from 'lodash.debounce';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { useAuthContext } from '../contexts/AuthContext';
import PostsModal from './PostsModal';
import LoadingSpinner from './LoadingSpinner';
import CountryPicker from './CountryPicker';
import ImageCropper from './ImageCropper';
import { ProfileTimelineItem } from './ProfileTimelineItem';
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

type EditSection = 'basics' | 'experience' | 'education' | 'skills' | 'achievements';
type Toast = { tone: 'success' | 'error'; text: string };

const BLANK_EXPERIENCE: Omit<Experience, 'id'> = { title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '', logo: '' };
const BLANK_EDUCATION: Omit<Education, 'id'> = { degree: '', school: '', startDate: '', endDate: '', description: '', gpa: '' };
const BLANK_ACHIEVEMENT: Omit<Achievement, 'id'> = { title: '', organization: '', date: '', type: '', description: '' };

const ProfilePage: React.FC = () => {
  const isPhone = useMediaQuery({ maxWidth: 767 });
  const phoneViewport = usePhoneViewport(isPhone);
  const createClientItemId = () => Date.now() + Math.floor(Math.random() * 1000000);

  const { user, profile, updateProfile } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editSection, setEditSection] = useState<EditSection>('basics');
  const [showPostsModal, setShowPostsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
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
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [skillDraft, setSkillDraft] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [connectionsCount, setConnectionsCount] = useState(0);

  // Cropping state
  const [isCropping, setIsCropping] = useState(false);
  const [activeExperienceLocationId, setActiveExperienceLocationId] = useState<number | string | null>(null);
  const [activeExperienceTitleId, setActiveExperienceTitleId] = useState<number | string | null>(null);
  const [filteredJobTitles, setFilteredJobTitles] = useState<string[]>([]);
  const [activeExperienceCompanyId, setActiveExperienceCompanyId] = useState<number | string | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<{ name: string; domain: string | null; logo_url: string | null }[]>([]);
  const [tempImage, setTempImage] = useState<string | null>(null);


  useEffect(() => {
    if (profile) {
      const normalizedSections = getNormalizedProfileSections(profile);
      setEditForm({
        full_name: profile.full_name || '',
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
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

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

  // Nominatim (with addressdetails=1, already requested above) returns a
  // lowercase ISO 3166-1 alpha-2 country_code on every suggestion's address —
  // map it to the alpha-3 code CountryPicker/world-countries expects, so
  // picking a location keeps Country in sync instead of the two being able
  // to silently contradict each other.
  const countryCodeFromSuggestion = (suggestion: any): string | null => {
    const alpha2 = suggestion?.address?.country_code;
    if (!alpha2) return null;
    const match = countries.find((c: any) => c.cca2.toLowerCase() === String(alpha2).toLowerCase());
    return match?.cca3 || null;
  };

  const handleLocationSelect = (suggestion: any) => {
    const displayName = suggestion.label || formatLocationSuggestion(suggestion);
    const derivedCountryCode = countryCodeFromSuggestion(suggestion);
    setEditForm({
      ...editForm,
      location: displayName,
      ...(derivedCountryCode ? { country_code: derivedCountryCode } : {}),
    });
    setLocationQuery(displayName);
    setShowLocationSuggestions(false);
    setLocationError('');
  };

  const handleExperienceLocationInput = (expId: number | string, value: string) => {
    updateItem('experiences', expId, { location: value });
    setActiveExperienceLocationId(expId);
    setActiveExperienceTitleId(null); // Reset title search
    setActiveExperienceCompanyId(null); // Reset company search
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
    setActiveExperienceCompanyId(null); // Reset company search
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

  // Debounced fetch against api/company-suggestions.js (proxies logo.dev's
  // Brand Search API — real companies, not a static list, same reasoning as
  // the location autocomplete above).
  const fetchCompanySuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query || query.trim().length < 2) {
        setCompanySuggestions([]);
        return;
      }
      try {
        const response = await fetch(`/api/company-suggestions?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setCompanySuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        setCompanySuggestions([]);
      }
    }, 300),
    []
  );

  const handleExperienceCompanyInput = (expId: number | string, value: string) => {
    updateItem('experiences', expId, { company: value });
    setActiveExperienceCompanyId(expId);
    setActiveExperienceTitleId(null);
    setActiveExperienceLocationId(null);
    setShowLocationSuggestions(false);
    fetchCompanySuggestions(value);
  };

  const handleExperienceCompanySelect = (expId: number | string, suggestion: { name: string }) => {
    updateItem('experiences', expId, { company: suggestion.name });
    setActiveExperienceCompanyId(null);
    setCompanySuggestions([]);
  };

  // Suggestions are the primary fix (real companies, not a bare text box).
  // On top of that, this blocks only unambiguous non-names — repeated single
  // characters, or text with no letters at all — deliberately not a
  // stricter "looks like a real word" check, since that would reject
  // legitimate short acronym company names (BMW, HP, GE, DHL, ...).
  const isVagueCompanyName = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) return true;
    if (!/[a-zA-Z]/.test(trimmed)) return true;
    if (/^(.)\1*$/.test(trimmed)) return true;
    return false;
  };

  const validateExperienceCompanies = () => {
    for (const exp of editForm.experiences) {
      if (isBlankExperience(exp)) continue;
      if (exp.company && isVagueCompanyName(exp.company)) {
        return false;
      }
    }
    return true;
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

  // profile.title/company (shown elsewhere as a person's "current role" —
  // e.g. applicant cards, connections, messages) are no longer separate
  // manually-typed fields in this form; they're derived from Experience
  // instead, so there's exactly one place to keep them accurate. Prefers
  // the entry marked "current", falling back to the most recently started.
  const deriveCurrentRole = (experiences: Experience[]): { title: string; company: string } => {
    const real = experiences.filter((exp) => !isBlankExperience(exp));
    const current = real.find((exp) => exp.current);
    const mostRecent = current || [...real].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))[0];
    return { title: mostRecent?.title || '', company: mostRecent?.company || '' };
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

    // Validate experience companies
    if (!validateExperienceCompanies()) {
      setSaveError('Please enter a valid company name for each work experience entry — pick one from the suggestions if possible.');
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

      const currentRole = deriveCurrentRole(normalizedSections.experiences as Experience[]);

      const updates: any = {
        full_name: editForm.full_name,
        title: currentRole.title,
        company: currentRole.company,
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
      setToast({ tone: 'success', text: 'Profile saved.' });
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
      setLocationError('');
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

  const getMonogram = (label?: string) => {
    if (!label) return 'TT';
    return label
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'TT';
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

  const toggleCollapsed = (id: number | string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Opens the editor on one section. Longer lists start with only the first
  // entry open; "add" collapses the existing ones and opens a new blank entry.
  const openEditor = (section: EditSection, options?: { add?: boolean }) => {
    const collapsed = new Set<string>();
    const collapseFrom = (items: { id: number | string }[], sectionName: EditSection) => {
      const start = options?.add && section === sectionName ? 0 : 1;
      items.slice(start).forEach((item) => collapsed.add(String(item.id)));
    };
    collapseFrom(editForm.experiences, 'experience');
    collapseFrom(editForm.education, 'education');
    collapseFrom(editForm.achievements, 'achievements');
    setCollapsedIds(collapsed);

    if (options?.add) {
      if (section === 'experience') addItem('experiences', { ...BLANK_EXPERIENCE });
      if (section === 'education') addItem('education', { ...BLANK_EDUCATION });
      if (section === 'achievements') addItem('achievements', { ...BLANK_ACHIEVEMENT });
    }
    setSaveError(null);
    setEditSection(section);
    setIsEditing(true);
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/user/${user?.id}`;
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => setToast({ tone: 'success', text: 'Profile link copied — anyone with it can view your profile.' }))
      .catch(() => setToast({ tone: 'error', text: "Couldn't copy the link. Try again, or copy it from your browser's address bar." }));
  };

  const addSkill = () => {
    const name = skillDraft.trim();
    if (!name) return;
    const exists = editForm.skills.some((skill) => skill.name?.trim().toLowerCase() === name.toLowerCase());
    if (!exists) addItem('skills', { name, level: 50, category: '' });
    setSkillDraft('');
  };

  // Mirrors public.calculate_profile_completeness (supabase/migrations/
  // 20260905130000_profile_completeness_gate.sql) so this number always
  // matches the score checked when applying — keep the two in sync.
  const hasExperience = editForm.experiences.some((exp) => exp.title?.trim() && exp.company?.trim());
  const hasEducation = editForm.education.some((edu) => edu.degree?.trim() && edu.school?.trim());
  const namedSkills = editForm.skills.filter((skill) => skill.name?.trim());
  const skillPoints = Math.min(20, namedSkills.length * 7);
  const hasBio = Boolean(editForm.bio?.trim());
  const hasPhoto = Boolean(editForm.profile_picture_url?.trim());
  const strengthScore = (hasExperience ? 35 : 0) + (hasEducation ? 20 : 0) + skillPoints + (hasBio ? 15 : 0) + (hasPhoto ? 10 : 0);
  const strengthTodo: { label: string; points: number; section: EditSection; add?: boolean }[] = [
    ...(!hasExperience ? [{ label: 'Add your work experience', points: 35, section: 'experience' as EditSection, add: true }] : []),
    ...(!hasEducation ? [{ label: 'Add your education', points: 20, section: 'education' as EditSection, add: true }] : []),
    ...(skillPoints < 20 ? [{ label: namedSkills.length === 0 ? 'Add 3 skills' : 'Add more skills', points: 20 - skillPoints, section: 'skills' as EditSection }] : []),
    ...(!hasBio ? [{ label: 'Write a short bio', points: 15, section: 'basics' as EditSection }] : []),
    ...(!hasPhoto ? [{ label: 'Add a profile photo', points: 10, section: 'basics' as EditSection }] : []),
  ];

  const currentRole = deriveCurrentRole(editForm.experiences);
  const roleLine = [currentRole.title, currentRole.company].filter(Boolean).join(' at ');
  const visibleExperiences = editForm.experiences.filter((exp) => !isBlankExperience(exp));
  const visibleEducation = editForm.education.filter((edu) => edu.degree?.trim() || edu.school?.trim());
  const visibleAchievements = editForm.achievements.filter((item) => item.title?.trim() || item.organization?.trim());
  const coverStyle = {
    backgroundImage: editForm.cover_image_url
      ? `url("${editForm.cover_image_url}")`
      : 'linear-gradient(135deg, #4353FF 0%, #7C86FF 55%, #C7CCFF 100%)',
  };

  const inputClass = 'w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50';
  const textareaClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors resize-none disabled:bg-slate-50';
  const labelClass = 'block text-[12.5px] font-semibold text-slate-600 mb-1.5';
  const suggestionListClass = 'absolute z-20 bg-white border border-slate-200 rounded-xl mt-1 w-full max-h-56 overflow-y-auto shadow-lg py-1';
  const suggestionItemClass = 'px-3.5 py-2 text-[13px] cursor-pointer hover:bg-ink-wash flex items-center gap-2';
  const iconButtonClass = 'size-8 rounded-[9px] border border-slate-200 bg-white text-slate-600 hover:text-ink hover:bg-parchment-sunken transition-colors flex items-center justify-center';

  const renderAvatar = (size: number, textClass: string) =>
    editForm.profile_picture_url?.trim() ? (
      <img src={editForm.profile_picture_url} alt={editForm.full_name || 'Profile photo'} className="rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <span className={`rounded-full bg-ink-wash text-primary-hover font-display font-extrabold flex items-center justify-center ${textClass}`} style={{ width: size, height: size }}>
        {editForm.full_name?.trim() ? getMonogram(editForm.full_name) : <Users className="h-1/3 w-1/3" />}
      </span>
    );

  const renderSectionCard = (
    title: string,
    body: React.ReactNode,
    actions: { onAdd?: () => void; onEdit?: () => void; addLabel: string; editLabel: string }
  ) => (
    <section className="profile-section bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-extrabold text-ink">{title}</h2>
        <div className="profile-section-actions flex gap-1.5">
          {actions.onAdd && (
            <button type="button" className={iconButtonClass} onClick={actions.onAdd} aria-label={actions.addLabel} title={actions.addLabel}>
              <Plus className="h-4 w-4" />
            </button>
          )}
          {actions.onEdit && (
            <button type="button" className={iconButtonClass} onClick={actions.onEdit} aria-label={actions.editLabel} title={actions.editLabel}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {body}
    </section>
  );

  const renderEmptySection = (title: string, hint: string, actionLabel: string, onAction: () => void) => (
    <div className="profile-empty rounded-xl border-[1.5px] border-dashed border-slate-200 px-4 py-5 flex flex-col items-center gap-1.5 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      {hint && <p className="text-[12.5px] text-slate-500 max-w-sm">{hint}</p>}
      <button
        type="button"
        onClick={onAction}
        className="mt-1.5 h-9 px-3.5 rounded-[10px] bg-primary text-white text-[12.5px] font-bold hover:bg-primary-hover transition-colors flex items-center gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        {actionLabel}
      </button>
    </div>
  );

  const renderTimelineItem = (
    key: number | string,
    logoName: string,
    heading: string,
    subheading: string,
    meta: string,
    dates: string,
    description: string | undefined,
    isLast: boolean
  ) => (
    <ProfileTimelineItem
      key={key}
      logoName={logoName}
      heading={heading}
      subheading={subheading}
      meta={meta}
      dates={dates}
      description={description}
      isLast={isLast}
    />
  );

  const renderEntryHeader = (id: number | string, label: string, summary: string, onRemove: () => void) => {
    const isCollapsed = collapsedIds.has(String(id));
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleCollapsed(id)}
          aria-expanded={!isCollapsed}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
          <span className="text-[13px] font-extrabold text-ink truncate">{isCollapsed && summary ? summary : label}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-bold text-red-600 hover:bg-danger-tint transition-colors"
          disabled={isSaving}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    );
  };

  const entryCardClass = (id: number | string) =>
    `rounded-2xl border p-4 flex flex-col gap-3.5 ${collapsedIds.has(String(id)) ? 'border-slate-200' : 'border-primary/60'}`;

  const renderAddButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-xl border-[1.5px] border-dashed border-indigo-200 bg-ink-wash/60 text-[13px] font-bold text-primary-hover hover:bg-ink-wash transition-colors flex items-center justify-center gap-1.5"
      disabled={isSaving}
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );

  const editTabs: { id: EditSection; label: string }[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'achievements', label: 'Achievements' },
  ];

  const footerError = saveError || (locationError ? `${locationError} — add it on the Basics tab.` : null);

  return (
    <div className="mobile-page profile-page bg-parchment font-display min-h-screen flex flex-col overflow-x-hidden antialiased">
      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 md:px-6 py-4 md:py-9 flex flex-col gap-4 md:gap-5">
        {/* Header card */}
        <section className="profile-summary bg-white border border-slate-200 rounded-2xl md:rounded-[22px] overflow-hidden">
          <div className="mobile-profile-cover h-28 md:h-44 bg-center bg-cover bg-no-repeat" style={coverStyle} />
          <div className="profile-summary-content px-4 pb-5 md:px-8 md:pb-7 flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3 -mt-11 md:-mt-14">
              <div className="relative z-[1] shrink-0 rounded-full ring-4 md:ring-[5px] ring-white bg-white">
                <div className="md:hidden">{renderAvatar(84, 'text-[26px]')}</div>
                <div className="hidden md:block">{renderAvatar(112, 'text-[34px]')}</div>
              </div>
              <div className="flex gap-2 pb-1">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share profile"
                  className="h-10 w-10 md:w-auto md:px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:bg-parchment-sunken transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden md:inline">Share profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditor('basics')}
                  className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="md:hidden">Edit profile</span>
                  <span className="hidden md:inline">Edit profile</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-[22px] md:text-[28px] font-extrabold text-ink leading-tight flex items-center gap-2">
                {editForm.full_name || 'Your name'}
                {profile?.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-white fill-primary" aria-label="Verified" />}
              </h1>
              {roleLine ? (
                <p className="text-sm md:text-[15px] font-semibold text-slate-600">{roleLine}</p>
              ) : (
                <button type="button" onClick={() => openEditor('experience', { add: true })} className="self-start text-sm font-bold text-primary hover:underline">
                  + Add your current role
                </button>
              )}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-[12.5px] md:text-[13px] text-slate-500">
                {editForm.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{editForm.location}</span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <strong className="text-ink">{formatConnectionsCount(connectionsCount)}</strong> {connectionsCount === 1 ? 'connection' : 'connections'}
                </span>
              </div>
            </div>

            {editForm.bio?.trim() ? (
              <p className="text-[13.5px] md:text-[14.5px] leading-relaxed text-slate-600 max-w-3xl whitespace-pre-line">{editForm.bio}</p>
            ) : (
              <button type="button" onClick={() => openEditor('basics')} className="self-start text-[13px] font-bold text-primary hover:underline">
                + Write a short bio
              </button>
            )}
          </div>
        </section>

        <div className="md:hidden">
          <div className="profile-completion-mobile">
            <div><strong>{strengthScore === 100 ? 'Your profile is complete' : `Profile strength · ${strengthScore}%`}</strong><p>{strengthTodo[0]?.label || 'You’re ready to make connections.'}</p></div>
            {strengthTodo[0] && <button type="button" onClick={() => openEditor(strengthTodo[0].section, { add: strengthTodo[0].add })}>Complete</button>}
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 md:gap-5 items-start">
          <div className="w-full flex-1 min-w-0 flex flex-col gap-4 md:gap-5">
            {renderSectionCard(
              'Experience',
              visibleExperiences.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {visibleExperiences.map((exp, index) =>
                    renderTimelineItem(
                      exp.id,
                      exp.company,
                      exp.title || 'Untitled role',
                      exp.company,
                      exp.location,
                      formatDateRange(exp.startDate, exp.endDate, exp.current),
                      exp.description,
                      index === visibleExperiences.length - 1
                    )
                  )}
                </div>
              ) : (
                renderEmptySection('No work experience yet', 'Referrers look here first — and you need it before you can apply.', 'Add experience', () => openEditor('experience', { add: true }))
              ),
              { onAdd: () => openEditor('experience', { add: true }), onEdit: () => openEditor('experience'), addLabel: 'Add experience', editLabel: 'Edit experience' }
            )}

            {renderSectionCard(
              'Education',
              visibleEducation.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {visibleEducation.map((edu, index) =>
                    renderTimelineItem(
                      edu.id,
                      edu.school,
                      edu.degree || edu.school,
                      edu.degree ? edu.school : '',
                      edu.gpa?.trim() ? `GPA ${edu.gpa}` : '',
                      edu.startDate || edu.endDate ? formatDateRange(edu.startDate, edu.endDate, false) : '',
                      edu.description,
                      index === visibleEducation.length - 1
                    )
                  )}
                </div>
              ) : (
                renderEmptySection('No education yet', '', 'Add education', () => openEditor('education', { add: true }))
              ),
              { onAdd: () => openEditor('education', { add: true }), onEdit: () => openEditor('education'), addLabel: 'Add education', editLabel: 'Edit education' }
            )}
          </div>

          <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4 md:gap-5">
            {/* Profile strength */}
            <section className="profile-strength-desktop bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-base font-extrabold text-ink">Profile strength</h2>
                <span className="font-display text-xl font-extrabold text-ink">
                  {strengthScore}<span className="text-[13px] font-bold text-slate-500">/100</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-parchment-sunken overflow-hidden" role="progressbar" aria-valuenow={strengthScore} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${strengthScore >= 80 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${strengthScore}%` }} />
              </div>
              {!hasExperience && (
                <div className="flex gap-2 rounded-xl bg-amber-tint px-3 py-2.5 text-xs font-semibold leading-snug text-amber-ink">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Add your work experience to apply for roles.
                </div>
              )}
              {strengthTodo.length > 0 ? (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {strengthTodo.map((item) => (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => openEditor(item.section, { add: item.add })}
                        className="w-full flex items-center gap-2.5 py-2.5 text-left group"
                      >
                        <span className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-indigo-200" aria-hidden="true" />
                        <span className="flex-1 text-[13px] font-semibold text-ink group-hover:text-primary transition-colors">{item.label}</span>
                        <span className="text-xs font-bold text-primary">+{item.points}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-[13px] font-semibold text-success-ink">
                  <Check className="h-4 w-4" strokeWidth={3} />
                  Your profile is complete.
                </p>
              )}
            </section>

            {renderSectionCard(
              'Skills',
              namedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {namedSkills.map((skill) => (
                    <span key={skill.id} className="rounded-full bg-ink-wash px-3 py-1.5 text-[12.5px] font-bold text-primary-hover">{skill.name}</span>
                  ))}
                </div>
              ) : (
                renderEmptySection('No skills yet', '', 'Add skills', () => openEditor('skills'))
              ),
              { onEdit: () => openEditor('skills'), addLabel: 'Add skills', editLabel: 'Edit skills' }
            )}

            {renderSectionCard(
              'Achievements',
              visibleAchievements.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {visibleAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex gap-3">
                      <span className="size-[38px] shrink-0 rounded-[11px] bg-amber-tint text-amber-ink flex items-center justify-center">
                        <Trophy className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <p className="text-sm font-bold text-ink">{achievement.title}</p>
                        <p className="text-[12.5px] text-slate-600">
                          {[achievement.organization, achievement.date ? formatDate(achievement.date) : ''].filter(Boolean).join(' · ')}
                        </p>
                        {achievement.description?.trim() && (
                          <p className="text-[12.5px] leading-snug text-slate-500 mt-0.5">{achievement.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                renderEmptySection('No achievements yet', 'Awards, certifications or anything you\'re proud of.', 'Add achievement', () => openEditor('achievements', { add: true }))
              ),
              { onAdd: () => openEditor('achievements', { add: true }), onEdit: () => openEditor('achievements'), addLabel: 'Add achievement', editLabel: 'Edit achievements' }
            )}
          </aside>
        </div>
      </main>

      {/* Edit panel — a drawer on larger screens, full screen on phones */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/45">
          <form
            onSubmit={(e) => {
              if (!locationQuery.trim()) setEditSection('basics');
              handleEditSubmit(e);
            }}
            style={phoneViewport}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="profile-editor-panel w-full md:max-w-[560px] h-[100dvh] bg-white flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-5 pb-2">
              <h2 id="edit-profile-title" className="font-display text-lg md:text-[19px] font-extrabold text-ink">Edit profile</h2>
              <button
                type="button"
                onClick={handleCancel}
                className="size-9 rounded-full bg-parchment-sunken text-ink hover:bg-slate-200 transition-colors flex items-center justify-center"
                disabled={isSaving}
                aria-label="Close without saving"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mobile-editor-select md:hidden">
              <span className="sr-only">Profile section</span>
              <select value={editSection} onChange={e => setEditSection(e.target.value as EditSection)}>
                {editTabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
              </select>
            </label>
            <div className="profile-editor-tabs flex gap-5 px-4 md:px-6 border-b border-slate-200 overflow-x-auto no-scrollbar" role="tablist">
              {editTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={editSection === tab.id}
                  onClick={() => setEditSection(tab.id)}
                  className={`shrink-0 py-3 text-[13px] font-bold border-b-2 transition-colors ${editSection === tab.id ? 'border-primary text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 flex flex-col gap-4">
              {editSection === 'basics' && (
                <>
                  <div className="flex flex-col gap-2">
                    <span className={labelClass}>Cover and photo</span>
                    <div className="relative h-24 md:h-28 rounded-2xl bg-center bg-cover" style={coverStyle}>
                      <label className="absolute right-2.5 top-2.5 flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-ink/50 hover:bg-ink/65 text-white text-xs font-bold cursor-pointer transition-colors">
                        <Camera className="h-3.5 w-3.5" />
                        Change cover
                        <input type="file" accept="image/*" onChange={handleCoverImageChange} className="sr-only" disabled={isSaving} />
                      </label>
                    </div>
                    <div className="flex items-center gap-3.5 -mt-9 pl-3.5">
                      <div className="relative z-[1] rounded-full ring-4 ring-white bg-white">{renderAvatar(76, 'text-2xl')}</div>
                      <div className="flex items-center gap-3 mt-8">
                        <label className="text-[12.5px] font-bold text-primary hover:underline cursor-pointer">
                          {editForm.profile_picture_url ? 'Change photo' : 'Add photo'}
                          <input type="file" accept="image/*" onChange={handleProfilePictureChange} className="sr-only" disabled={isSaving} />
                        </label>
                        {editForm.profile_picture_url && (
                          <button type="button" onClick={handleDeleteAvatar} className="text-[12.5px] font-bold text-red-600 hover:underline" disabled={isSaving}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11.5px] text-slate-500">Images up to 5 MB. You can crop your photo after choosing it.</p>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Full name</span>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className={inputClass}
                      disabled={isSaving}
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
                    <div className="relative">
                      <label className={labelClass} htmlFor="profile-location">Location</label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="profile-location"
                          type="text"
                          value={locationQuery}
                          onChange={handleLocationInput}
                          onBlur={() => {
                            setTimeout(() => setShowLocationSuggestions(false), 200);
                          }}
                          onFocus={() => setShowLocationSuggestions(true)}
                          className={`${inputClass} pl-10 ${locationError ? '!border-red-500' : ''}`}
                          placeholder="Type a city, state, or country..."
                          disabled={isSaving}
                          autoComplete="off"
                        />
                      </div>
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <ul className={suggestionListClass}>
                          {locationSuggestions.map((suggestion) => (
                            <li key={suggestion.place_id} className={suggestionItemClass} onMouseDown={() => handleLocationSelect(suggestion)}>
                              {suggestion.label}
                            </li>
                          ))}
                        </ul>
                      )}
                      {locationError && <p className="text-red-600 text-xs mt-1">{locationError}</p>}
                    </div>
                    <label className="block">
                      <span className={labelClass}>Country</span>
                      <CountryPicker
                        value={editForm.country_code}
                        onChange={val => setEditForm({ ...editForm, country_code: val })}
                        required
                        className={`${inputClass} cursor-pointer`}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Bio</span>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={4}
                      className={textareaClass}
                      placeholder="A few lines about what you do and what you're looking for"
                      disabled={isSaving}
                    />
                  </label>
                </>
              )}

              {editSection === 'experience' && (
                <>
                  {editForm.experiences.map((exp, index) => (
                    <div key={exp.id} className={entryCardClass(exp.id)}>
                      {renderEntryHeader(exp.id, `Role ${index + 1}`, [exp.title, exp.company].filter(Boolean).join(' · '), () => deleteItem('experiences', exp.id))}
                      {!collapsedIds.has(String(exp.id)) && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                              <label className={labelClass}>Job title</label>
                              <input
                                type="text"
                                value={exp.title}
                                onChange={(e) => handleExperienceTitleInput(exp.id, e.target.value)}
                                className={inputClass}
                                disabled={isSaving}
                                autoComplete="off"
                              />
                              {activeExperienceTitleId === exp.id && filteredJobTitles.length > 0 && (
                                <ul className={suggestionListClass}>
                                  {filteredJobTitles.map((title, idx) => (
                                    <li key={idx} className={suggestionItemClass} onMouseDown={() => handleExperienceTitleSelect(exp.id, title)}>
                                      {title}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="relative">
                              <label className={labelClass}>Company</label>
                              <input
                                type="text"
                                value={exp.company}
                                onChange={(e) => handleExperienceCompanyInput(exp.id, e.target.value)}
                                className={inputClass}
                                disabled={isSaving}
                                autoComplete="off"
                              />
                              {activeExperienceCompanyId === exp.id && companySuggestions.length > 0 && (
                                <ul className={suggestionListClass}>
                                  {companySuggestions.map((suggestion, idx) => (
                                    <li key={`${suggestion.name}-${idx}`} className={suggestionItemClass} onMouseDown={() => handleExperienceCompanySelect(exp.id, suggestion)}>
                                      {suggestion.logo_url && <img src={suggestion.logo_url} alt="" className="h-5 w-5 rounded object-contain" />}
                                      {suggestion.name}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <label className={labelClass}>Location</label>
                            <input
                              type="text"
                              value={exp.location}
                              onChange={(e) => handleExperienceLocationInput(exp.id, e.target.value)}
                              className={inputClass}
                              placeholder="Type a city, state, or country..."
                              disabled={isSaving}
                              autoComplete="off"
                            />
                            {activeExperienceLocationId === exp.id && locationSuggestions.length > 0 && (
                              <ul className={suggestionListClass}>
                                {locationSuggestions.map((suggestion) => (
                                  <li key={suggestion.place_id} className={suggestionItemClass} onMouseDown={() => handleExperienceLocationSelect(exp.id, suggestion)}>
                                    {suggestion.label}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className={labelClass}>Start date *</span>
                              <input
                                type="date"
                                value={exp.startDate}
                                onChange={(e) => updateItem('experiences', exp.id, { ...exp, startDate: e.target.value })}
                                className={inputClass}
                                disabled={isSaving}
                              />
                            </label>
                            <label className="block">
                              <span className={labelClass}>End date {!exp.current && '*'}</span>
                              <input
                                type="date"
                                value={exp.endDate}
                                min={exp.startDate || undefined}
                                onChange={(e) => updateItem('experiences', exp.id, { ...exp, endDate: e.target.value })}
                                className={inputClass}
                                disabled={exp.current || isSaving}
                              />
                            </label>
                          </div>
                          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer">
                            <span className="text-[13.5px] font-bold text-ink">I currently work here</span>
                            <input
                              type="checkbox"
                              role="switch"
                              className="peer sr-only"
                              checked={exp.current}
                              onChange={(e) => updateItem('experiences', exp.id, { ...exp, current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })}
                              disabled={isSaving}
                            />
                            <span
                              aria-hidden="true"
                              className="relative h-[23px] w-10 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 after:absolute after:left-[3px] after:top-[3px] after:h-[17px] after:w-[17px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[17px]"
                            />
                          </label>
                          <label className="block">
                            <span className={labelClass}>Description</span>
                            <textarea
                              value={exp.description}
                              onChange={(e) => updateItem('experiences', exp.id, { ...exp, description: e.target.value })}
                              rows={3}
                              className={textareaClass}
                              disabled={isSaving}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                  {renderAddButton(editForm.experiences.length > 0 ? 'Add another role' : 'Add a role', () => addItem('experiences', { ...BLANK_EXPERIENCE }))}
                </>
              )}

              {editSection === 'education' && (
                <>
                  {editForm.education.map((edu, index) => (
                    <div key={edu.id} className={entryCardClass(edu.id)}>
                      {renderEntryHeader(edu.id, `Education ${index + 1}`, [edu.degree, edu.school].filter(Boolean).join(' · '), () => deleteItem('education', edu.id))}
                      {!collapsedIds.has(String(edu.id)) && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className={labelClass}>Degree</span>
                              <input type="text" value={edu.degree} onChange={(e) => updateItem('education', edu.id, { ...edu, degree: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                            <label className="block">
                              <span className={labelClass}>School</span>
                              <input type="text" value={edu.school} onChange={(e) => updateItem('education', edu.id, { ...edu, school: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_0.6fr] gap-3">
                            <label className="block">
                              <span className={labelClass}>Start date</span>
                              <input type="date" value={edu.startDate} onChange={(e) => updateItem('education', edu.id, { ...edu, startDate: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                            <label className="block">
                              <span className={labelClass}>End date</span>
                              <input type="date" value={edu.endDate} onChange={(e) => updateItem('education', edu.id, { ...edu, endDate: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                            <label className="block col-span-2 sm:col-span-1">
                              <span className={labelClass}>GPA</span>
                              <input type="text" value={edu.gpa} onChange={(e) => updateItem('education', edu.id, { ...edu, gpa: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                          </div>
                          <label className="block">
                            <span className={labelClass}>Description</span>
                            <textarea value={edu.description} onChange={(e) => updateItem('education', edu.id, { ...edu, description: e.target.value })} rows={3} className={textareaClass} disabled={isSaving} />
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                  {renderAddButton(editForm.education.length > 0 ? 'Add more education' : 'Add education', () => addItem('education', { ...BLANK_EDUCATION }))}
                </>
              )}

              {editSection === 'skills' && (
                <div className="flex flex-col gap-3">
                  {namedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {namedSkills.map((skill) => (
                        <span key={skill.id} className="flex items-center gap-1.5 rounded-full bg-ink-wash pl-3 pr-2 py-1.5 text-[12.5px] font-bold text-primary-hover">
                          {skill.name}
                          <button type="button" onClick={() => deleteItem('skills', skill.id)} aria-label={`Remove ${skill.name}`} className="hover:text-red-600" disabled={isSaving}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Add a skill, e.g. Figma"
                      aria-label="Add a skill"
                      className={inputClass}
                      disabled={isSaving}
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="shrink-0 h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
                      disabled={isSaving || !skillDraft.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {editSection === 'achievements' && (
                <>
                  {editForm.achievements.map((achievement, index) => (
                    <div key={achievement.id} className={entryCardClass(achievement.id)}>
                      {renderEntryHeader(achievement.id, `Achievement ${index + 1}`, achievement.title, () => deleteItem('achievements', achievement.id))}
                      {!collapsedIds.has(String(achievement.id)) && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className={labelClass}>Title</span>
                              <input type="text" value={achievement.title} onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, title: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                            <label className="block">
                              <span className={labelClass}>Organization</span>
                              <input type="text" value={achievement.organization} onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, organization: e.target.value })} className={inputClass} disabled={isSaving} />
                            </label>
                          </div>
                          <label className="block">
                            <span className={labelClass}>Date</span>
                            <input type="date" value={achievement.date} onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, date: e.target.value })} className={inputClass} disabled={isSaving} />
                          </label>
                          <label className="block">
                            <span className={labelClass}>Description</span>
                            <textarea value={achievement.description} onChange={(e) => updateItem('achievements', achievement.id, { ...achievement, description: e.target.value })} rows={2} className={textareaClass} disabled={isSaving} />
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                  {renderAddButton(editForm.achievements.length > 0 ? 'Add another achievement' : 'Add an achievement', () => addItem('achievements', { ...BLANK_ACHIEVEMENT }))}
                </>
              )}
            </div>

            {footerError && (
              <div className="flex gap-2 items-start px-4 md:px-6 py-2.5 bg-danger-tint border-t border-red-200 text-[12.5px] leading-snug font-semibold text-red-600" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
                {footerError}
              </div>
            )}
            <div className="flex items-center gap-2.5 px-4 md:px-6 pt-3 pb-5 md:py-3.5 border-t border-slate-200 bg-parchment">
              <span className="hidden sm:block flex-1 text-xs text-slate-500">{isSaving ? 'Saving changes…' : ''}</span>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 sm:flex-none h-11 px-5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-parchment-sunken transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[1.4] sm:flex-none h-11 px-5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-5 z-[110] flex justify-center pointer-events-none">
          <div role="status" className="pointer-events-auto flex items-center gap-2.5 max-w-md w-full rounded-xl bg-ink px-4 py-3 text-[13px] text-white shadow-xl">
            {toast.tone === 'success' ? <Check className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={3} /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />}
            <span className="flex-1">{toast.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="shrink-0 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
