import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { getVersionInfo } from '../lib/supabase';

/**
 * Compares two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  // Ensure both arrays have the same length
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }
  return 0;
}

export const VersionCheck = () => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [minimumVersion, setMinimumVersion] = useState<string>('');

  useEffect(() => {
    const checkVersion = async () => {
      // Only check in Tauri environment
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (!isTauri) {
        return;
      }

      try {
        // Get current app version
        const appVersion = await getVersion();
        setCurrentVersion(appVersion);

        // Detect platform from user agent
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        // Fetch version info from Supabase function
        const versionInfo = await getVersionInfo();
        setMinimumVersion(versionInfo.minimumVersion);

        // Compare versions
        if (compareVersions(appVersion, versionInfo.minimumVersion) < 0) {
          // Current version is too low
          const url = isIOS ? versionInfo.iosUrl : versionInfo.androidUrl;
          setStoreUrl(url);
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.error('Error checking version:', error);
        // Don't block the app if version check fails
      }
    };

    checkVersion();
  }, []);

  if (!showUpdateModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Update Required</h2>
        <p className="text-gray-700 mb-4">
          We've got new features on the way and your app is out of date! Please update to keep playing :-)
        </p>
        <div className="flex gap-3">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium text-center"
          >
            Update Now
          </a>
        </div>
      </div>
    </div>
  );
};

