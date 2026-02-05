// Offline detection and caching utilities
export const isOnline = () => navigator.onLine;

export const getCachedData = (key: string) => {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache expires after 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading cached data:', error);
  }
  return null;
};

export const setCachedData = (key: string, data: any) => {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

export const getOfflineMessage = (type: 'search' | 'profile' | 'general') => {
  switch (type) {
    case 'search':
      return {
        title: 'You\'re offline',
        message: 'Search results are not available while offline. Please check your internet connection and try again.',
        icon: 'wifi_off'
      };
    case 'profile':
      return {
        title: 'Profile unavailable',
        message: 'This profile cannot be loaded while offline. Please check your internet connection.',
        icon: 'person_off'
      };
    default:
      return {
        title: 'You\'re offline',
        message: 'Some features are not available while offline. Please check your internet connection.',
        icon: 'cloud_off'
      };
  }
};