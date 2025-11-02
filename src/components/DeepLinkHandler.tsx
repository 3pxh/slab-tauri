import { useEffect } from 'react';
import { useNavigate } from 'react-router';

// Component to handle deep links after router is mounted
export const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const initDeepLinks = async () => {
      try {
        // Check if we're running in Tauri
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
          
          // Check if app was started via deep link
          const startUrls = await getCurrent();
          if (startUrls && startUrls.length > 0) {
            handleDeepLink(startUrls[0]);
          }
          
          // Listen for deep links while app is running
          await onOpenUrl((urls) => {
            if (urls && urls.length > 0) {
              handleDeepLink(urls[0]);
            }
          });
        }
      } catch (error) {
        // Deep link plugin might not be available (e.g., in browser)
        console.log('Deep link plugin not available:', error);
      }
    };

    // Handle deep link URL by extracting path and navigating
    const handleDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        
        // Navigate to the path using React Router
        navigate(path, { replace: false });
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    initDeepLinks();
  }, [navigate]);

  return null; // This component doesn't render anything
};
