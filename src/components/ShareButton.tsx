import React from 'react';
import { FiShare2 } from 'react-icons/fi';
import { IoShareOutline, IoShare } from 'react-icons/io5';
import { isIOS } from '../utils';

interface ShareButtonProps {
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
  size?: number;
  variant?: 'icon' | 'button';
}

/**
 * ShareButton component that uses iOS-native styling when on iOS
 * On iOS, it uses the standard iOS share button appearance
 * On other platforms, it uses a custom styled button
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  onClick,
  title = 'Share',
  ariaLabel = 'Share',
  className = '',
  size = 20,
  variant = 'icon',
}) => {
  const ios = isIOS();

  if (ios) {
    // iOS native share button styling
    if (variant === 'button') {
      return (
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-[#007AFF] hover:bg-[#0051D5] active:bg-[#0040AA] transition-colors ${className}`}
          title={title}
          aria-label={ariaLabel}
        >
          <IoShare size={size} />
          <span>Share</span>
        </button>
      );
    } else {
      return (
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center p-2 rounded-lg text-[#007AFF] hover:bg-[#007AFF]/10 active:bg-[#007AFF]/20 transition-colors ${className}`}
          title={title}
          aria-label={ariaLabel}
        >
          <IoShareOutline size={size} />
        </button>
      );
    }
  } else {
    // Non-iOS styling (existing custom button)
    if (variant === 'button') {
      return (
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors ${className}`}
          title={title}
          aria-label={ariaLabel}
        >
          <FiShare2 size={size} />
          <span>Share</span>
        </button>
      );
    } else {
      return (
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center p-2 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors ${className}`}
          title={title}
          aria-label={ariaLabel}
        >
          <FiShare2 size={size} />
        </button>
      );
    }
  }
};

