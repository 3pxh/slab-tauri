import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDebugLog } from './DebugLog';

// Component to handle deep links after router is mounted
export const DeepLinkHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addLog } = useDebugLog();
  const hasHandledInitialDeepLink = useRef(false);

  // Handle deep link URL by extracting path and navigating
  const handleDeepLink = useCallback((url: string, replace: boolean) => {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname + urlObj.search + urlObj.hash;
      
      // Ensure path is not empty - default to home
      if (!path || path === '/') {
        path = '/';
      }
      
      addLog(`Deep link received: ${url}`, 'info');
      addLog(`Extracted path: ${path}`, 'info');
      addLog(`Current location: ${location.pathname + location.search + location.hash}`, 'info');
      
      // Also log to console for debugging
      console.log('Deep link received:', url);
      console.log('Extracted path:', path);
      console.log('Current location:', location.pathname + location.search + location.hash);
      
      // Navigate to the path using React Router
      // React Router will handle deduplication if we're already on the target path
      addLog(`Navigating to: ${path} (replace: ${replace})`, 'info');
      console.log('Navigating to:', path, 'replace:', replace);
      navigate(path, { replace, state: { fromDeepLink: true } });
      addLog(`Navigation completed to: ${path}`, 'success');
    } catch (error) {
      const errorMessage = `Error handling deep link: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addLog(`${errorMessage} - URL: ${url}`, 'error');
      console.error('Error handling deep link:', error);
      console.error('URL that failed:', url);
    }
  }, [navigate, location, addLog]);

  useEffect(() => {
    const initDeepLinks = async () => {
      // Log environment info for debugging
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      addLog(`Environment check: Tauri=${isTauri}, window=${typeof window !== 'undefined'}`, 'info');
      
      if (!isTauri) {
        addLog('Not running in Tauri environment - deep links will not work', 'info');
        return;
      }

      try {
        addLog('Attempting to import deep link plugin...', 'info');
        const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
        addLog('Deep link plugin imported successfully', 'success');
        
        // Check if app was started via deep link
        addLog('Checking for initial deep link URLs...', 'info');
        const startUrls = await getCurrent();
        addLog(`Initial deep link URLs: ${JSON.stringify(startUrls)}`, 'info');
        
        if (startUrls && startUrls.length > 0 && !hasHandledInitialDeepLink.current) {
          const url = startUrls[0];
          addLog(`App opened via deep link: ${url}`, 'info');
          console.log('App opened via deep link:', url);
          // Use replace: true for initial navigation to replace the default route
          // Use setTimeout to ensure navigation happens after current render cycle
          setTimeout(() => {
            handleDeepLink(url, true);
          }, 0);
          hasHandledInitialDeepLink.current = true;
        } else {
          addLog('No initial deep link URLs found', 'info');
        }
        
        // Listen for deep links while app is running
        addLog('Setting up deep link listener...', 'info');
        await onOpenUrl((urls) => {
          if (urls && urls.length > 0) {
            const url = urls[0];
            addLog(`Deep link received while app running: ${url}`, 'info');
            console.log('Deep link received while app running:', url);
            // Use replace: false for subsequent navigations to allow back button
            handleDeepLink(url, false);
          }
        });
        addLog('Deep link listener set up successfully', 'success');
      } catch (error) {
        // Deep link plugin might not be available (e.g., in browser)
        const errorDetails = error instanceof Error 
          ? `${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`
          : String(error);
        const errorMessage = `Deep link plugin error: ${errorDetails}`;
        addLog(errorMessage, 'error');
        console.error('Deep link plugin error:', error);
      }
    };

    // Small delay to ensure router is fully initialized
    const timer = setTimeout(() => {
      initDeepLinks();
    }, 100);

    return () => clearTimeout(timer);
  }, [handleDeepLink, addLog]);

  return null; // This component doesn't render anything
};
