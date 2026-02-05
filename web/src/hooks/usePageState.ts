import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// This hook manages page state persistence across refreshes
export const usePageState = (initialPage: string = 'home') => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize state from URL path or sessionStorage
  const [currentPage, setCurrentPage] = useState(() => {
    // First try to get page from URL
    const path = location.pathname.substring(1);
    if (path) {
      return path;
    }
    
    // Then try sessionStorage
    const savedPage = sessionStorage.getItem('tanktide_current_page');
    if (savedPage) {
      return savedPage;
    }
    
    // Fall back to initial page
    return initialPage;
  });

  // Update sessionStorage when page changes
  useEffect(() => {
    if (currentPage) {
      sessionStorage.setItem('tanktide_current_page', currentPage);
    }
  }, [currentPage]);

  // Update URL when page changes
  useEffect(() => {
    const path = currentPage === 'home' ? '/' : `/${currentPage}`;
    const currentPath = location.pathname;
    
    // Only update if the path is different and it's not a landing page
    if (path !== currentPath && currentPage !== 'landing') {
      navigate(path, { 
        replace: true,
        state: { internal: true } // Mark as internal navigation
      });
    }
  }, [currentPage, navigate, location.pathname]);

  // Listen for URL changes from browser navigation
  useEffect(() => {
    // Only handle if it's not an internal navigation
    if (!location.state || !(location.state as any).internal) {
      const path = location.pathname.substring(1);
      const pageFromPath = path || 'home';
      
      if (pageFromPath !== currentPage) {
        setCurrentPage(pageFromPath);
      }
    }
  }, [location, currentPage]);

  return { currentPage, setCurrentPage };
};

export default usePageState;