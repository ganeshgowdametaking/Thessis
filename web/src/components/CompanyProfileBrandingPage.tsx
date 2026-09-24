import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Upload, Save, Eye, ChevronDown, Search } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CompanyProfile {
  id: string;
  company_name: string; // Maps to 'company' in database
  website: string; // Not in database yet
  logo_url?: string; // Maps to 'avatar_url' in database
  banner_url?: string; // Maps to 'cover_image_url' in database
  about_us: string; // Maps to 'bio' in database
  industry: string; // Not in database yet
  company_size: string; // Not in database yet
  founded_year: string; // Not in database yet
  location: string;
}

// Location data with major cities and countries
const locationOptions = [
  // United States
  'New York, NY, USA', 'Los Angeles, CA, USA', 'San Francisco, CA, USA', 'Chicago, IL, USA', 'Boston, MA, USA',
  'Seattle, WA, USA', 'Austin, TX, USA', 'Denver, CO, USA', 'Miami, FL, USA', 'Atlanta, GA, USA',
  'Washington, DC, USA', 'Dallas, TX, USA', 'Houston, TX, USA', 'Phoenix, AZ, USA', 'San Diego, CA, USA',
  
  // United Kingdom
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Glasgow, UK', 'Liverpool, UK',
  
  // Canada
  'Toronto, ON, Canada', 'Vancouver, BC, Canada', 'Montreal, QC, Canada', 'Calgary, AB, Canada',
  
  // Germany
  'Berlin, Germany', 'Munich, Germany', 'Hamburg, Germany', 'Frankfurt, Germany', 'Cologne, Germany',
  
  // France
  'Paris, France', 'Lyon, France', 'Marseille, France', 'Toulouse, France',
  
  // Netherlands
  'Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'The Hague, Netherlands',
  
  // Sweden
  'Stockholm, Sweden', 'Gothenburg, Sweden', 'Malmö, Sweden',
  
  // Norway
  'Oslo, Norway', 'Bergen, Norway', 'Trondheim, Norway',
  
  // Denmark
  'Copenhagen, Denmark', 'Aarhus, Denmark', 'Odense, Denmark',
  
  // Finland
  'Helsinki, Finland', 'Espoo, Finland', 'Tampere, Finland',
  
  // Switzerland
  'Zurich, Switzerland', 'Geneva, Switzerland', 'Basel, Switzerland', 'Bern, Switzerland',
  
  // Austria
  'Vienna, Austria', 'Graz, Austria', 'Linz, Austria',
  
  // Belgium
  'Brussels, Belgium', 'Antwerp, Belgium', 'Ghent, Belgium',
  
  // Ireland
  'Dublin, Ireland', 'Cork, Ireland', 'Galway, Ireland',
  
  // Australia
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia',
  
  // New Zealand
  'Auckland, New Zealand', 'Wellington, New Zealand', 'Christchurch, New Zealand',
  
  // Singapore
  'Singapore, Singapore',
  
  // Hong Kong
  'Hong Kong, Hong Kong',
  
  // Japan
  'Tokyo, Japan', 'Osaka, Japan', 'Kyoto, Japan', 'Yokohama, Japan',
  
  // South Korea
  'Seoul, South Korea', 'Busan, South Korea', 'Incheon, South Korea',
  
  // India
  'Mumbai, India', 'Delhi, India', 'Bangalore, India', 'Hyderabad, India', 'Chennai, India',
  
  // China
  'Beijing, China', 'Shanghai, China', 'Shenzhen, China', 'Guangzhou, China',
  
  // Remote/Other
  'Remote', 'Remote - US', 'Remote - Europe', 'Remote - Global'
];

interface LocationDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = locationOptions.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (location: string) => {
    onChange(location);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (!isOpen) setIsOpen(true);
    
    // If user types something not in the list, allow custom input
    if (!locationOptions.includes(newValue)) {
      onChange(newValue);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary pr-10"
          placeholder="Type to search or enter custom location"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => handleSelect(option)}
                className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-500 text-sm">
              No matches found. Type to add custom location.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CompanyProfileBrandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState<CompanyProfile>({
    id: '',
    company_name: profile?.company || '',
    website: '',
    logo_url: profile?.avatar_url || '',
    banner_url: profile?.cover_image_url || '',
    about_us: profile?.bio || '',
    industry: '',
    company_size: '',
    founded_year: '',
    location: profile?.location || '',
  });

  useEffect(() => {
    if (user) {
      loadCompanyProfile();
    }
  }, [user]);

  const loadCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          id: data.id,
          company_name: data.company || '', // company -> company_name
          website: '', // Not in database yet
          logo_url: data.avatar_url || '', // avatar_url -> logo_url
          banner_url: data.cover_image_url || '', // cover_image_url -> banner_url
          about_us: data.bio || '', // bio -> about_us
          industry: '', // Not in database yet
          company_size: '', // Not in database yet
          founded_year: '', // Not in database yet
          location: data.location || '',
        });
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/company-logo-${Date.now()}.${fileExt}`;
      
      // Use the avatars bucket for company logos
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        if (error.message.includes('bucket')) {
          alert('Upload failed: Storage bucket not configured. Please contact support.');
        } else {
          alert(`Upload failed: ${error.message}`);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        logo_url: publicUrl
      }));
      
      alert('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB for banners)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/company-banner-${Date.now()}.${fileExt}`;
      
      // Use the cover-images bucket for company banners
      const { data, error } = await supabase.storage
        .from('cover-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        if (error.message.includes('bucket')) {
          alert('Upload failed: Storage bucket not configured. Please contact support.');
        } else {
          alert(`Upload failed: ${error.message}`);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cover-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        banner_url: publicUrl
      }));
      
      alert('Banner uploaded successfully!');
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Error uploading banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Map form data to actual database fields
      const updateData = {
        company: formData.company_name, // company_name -> company
        avatar_url: formData.logo_url, // logo_url -> avatar_url
        account_type: 'company', // marks this profile's avatar_url as a real company logo, not a personal photo
        cover_image_url: formData.banner_url, // banner_url -> cover_image_url
        bio: formData.about_us, // about_us -> bio
        location: formData.location,
        // Note: website, industry, company_size, founded_year are not in the profiles table
        // These would need to be added to the database schema or stored elsewhere
      };

      console.log('User ID:', user.id);
      console.log('Updating profile with data:', updateData);

      // First, check if the profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it first
        console.log('Profile does not exist, creating new profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            ...updateData
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        console.log('Profile created successfully:', newProfile);
      } else if (checkError) {
        console.error('Error checking profile:', checkError);
        throw checkError;
      } else {
        // Profile exists, update it
        console.log('Profile exists, updating...');
        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id)
          .select();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('Profile updated successfully:', data);
      }
      
      // Reload the profile data to ensure we have the latest data
      await loadCompanyProfile();
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Error saving profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Profile & Branding</h1>
            <p className="text-slate-600 mt-2">Manage your company's public profile and branding</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900"
            >
              <Eye className="h-4 w-4" />
              <span>{previewMode ? 'Edit' : 'Preview'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-hover transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {previewMode ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {/* Banner */}
          {formData.banner_url && (
            <div className="h-48 bg-cover bg-center rounded-t-lg" style={{ backgroundImage: `url(${formData.banner_url})` }} />
          )}
          
          <div className="p-8">
            <div className="flex items-center space-x-4 mb-6">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Company Logo" className="h-16 w-16 rounded-lg" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{formData.company_name || 'Your Company'}</h2>
                <p className="text-slate-600">{formData.industry} • {formData.company_size} • {formData.location}</p>
                {formData.website && (
                  <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {formData.website}
                  </a>
                )}
              </div>
            </div>

            {formData.about_us && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">About Us</h3>
                <p className="text-slate-700 whitespace-pre-line">{formData.about_us}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-900">Founded:</span>
                <span className="ml-2 text-slate-600">{formData.founded_year || 'Not specified'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-900">Industry:</span>
                <span className="ml-2 text-slate-600">{formData.industry || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Company Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Size</label>
                <select
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Founded Year</label>
                <input
                  type="number"
                  name="founded_year"
                  value={formData.founded_year}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="e.g., 2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                <LocationDropdown
                  value={formData.location}
                  onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                />
              </div>
            </div>
          </div>

          {/* Branding Assets */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Branding Assets</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                <div className="flex items-center space-x-4">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="h-16 w-16 rounded-lg" />
                  )}
                  <label className={`cursor-pointer px-4 py-2 rounded-lg transition-colors flex items-center ${
                    loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-parchment-sunken'
                  }`}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">Max size: 5MB. Supported formats: JPG, PNG, GIF</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Banner Image</label>
                <div className="flex items-center space-x-4">
                  {formData.banner_url && (
                    <img src={formData.banner_url} alt="Banner" className="h-16 w-32 object-cover rounded-lg" />
                  )}
                  <label className={`cursor-pointer px-4 py-2 rounded-lg transition-colors flex items-center ${
                    loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-parchment-sunken'
                  }`}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Banner
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">Max size: 10MB. Recommended: 1200x300px</p>
              </div>
            </div>
          </div>

          {/* About Us */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">About Us</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company Description</label>
              <textarea
                name="about_us"
                value={formData.about_us}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="Tell potential candidates about your company, culture, mission, and what makes you unique..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyProfileBrandingPage; 