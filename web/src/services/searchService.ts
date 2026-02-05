import { supabase } from '../lib/supabase'
import { profileService } from './profileService'

export const searchService = {
  // Save search query to localStorage for recent searches
  saveRecentSearch: (query: string) => {
    if (!query.trim()) return;
    
    const userId = supabase.auth.getUser().then(({ data }) => data.user?.id);
    if (!userId) return;
    
    const storageKey = `recent_searches_${userId}`;
    const recentSearches = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Remove if already exists and add to beginning
    const filteredSearches = recentSearches.filter((search: string) => 
      search.toLowerCase() !== query.toLowerCase()
    );
    
    const updatedSearches = [query, ...filteredSearches].slice(0, 5); // Keep only 5 recent searches
    localStorage.setItem(storageKey, JSON.stringify(updatedSearches));
  },

  // Get recent searches from localStorage
  getRecentSearches: async (): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const storageKey = `recent_searches_${user.id}`;
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (error) {
      console.error('Error getting recent searches:', error);
      return [];
    }
  },

  // Search users with real-time suggestions
  searchUsers: async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      const results = await profileService.searchProfiles(query);
      return results.map(profile => ({
        type: 'profile',
        text: `${profile.full_name}${profile.title ? ` - ${profile.title}` : ''}`,
        icon: '👤',
        image: profile.avatar_url || null,
        company: profile.company || 'Professional',
        userId: profile.id,
        profile: profile
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Search companies
  searchCompanies: async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('company')
        .not('company', 'is', null)
        .ilike('company', `%${query}%`)
        .limit(5);

      if (error) throw error;

      // Get unique companies
      const uniqueCompanies = [...new Set(data.map(item => item.company))];
      
      return uniqueCompanies.map(company => ({
        type: 'company',
        text: company,
        icon: '🏢',
        image: null,
        company: company
      }));
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  },

  // Combined search function
  performSearch: async (query: string) => {
    if (!query.trim()) {
      return {
        users: [],
        companies: [],
        recent: await searchService.getRecentSearches()
      };
    }

    const [users, companies] = await Promise.all([
      searchService.searchUsers(query),
      searchService.searchCompanies(query)
    ]);

    return {
      users: users.slice(0, 3), // Limit to 3 users
      companies: companies.slice(0, 2), // Limit to 2 companies
      recent: []
    };
  }
};