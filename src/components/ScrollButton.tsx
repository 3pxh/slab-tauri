import React from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface ScrollButtonProps {
  onClick: () => void;
  isVisible: boolean;
  direction: 'up' | 'down';
  title?: string;
  ariaLabel?: string;
  position?: 'left' | 'center' | 'right';
}

const ScrollButton: React.FC<ScrollButtonProps> = ({ 
  onClick, 
  isVisible, 
  direction,
  title,
  ariaLabel,
  position = 'right'
}) => {
  if (!isVisible) return null;

  const handleClick = () => {
    console.log(`ScrollButton (${direction}) clicked!`);
    onClick();
  };

  const defaultTitle = direction === 'up' ? "Scroll to top" : "Scroll to bottom";
  const defaultAriaLabel = direction === 'up' ? "Scroll to top" : "Scroll to bottom";
  const verticalPosition = direction === 'up' ? "top-2" : "bottom-2";
  
  // Horizontal positioning
  const horizontalPosition = position === 'left' ? "left-2" : 
                           position === 'center' ? "left-1/2 transform -translate-x-1/2" : 
                           "right-2";

  return (
    <button
      onClick={handleClick}
      className={`fixed ${verticalPosition} ${horizontalPosition} w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-110 flex items-center justify-center z-50`}
      title={title || defaultTitle}
      aria-label={ariaLabel || defaultAriaLabel}
    >
      {direction === 'up' ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
    </button>
  );
};

export default ScrollButton;
