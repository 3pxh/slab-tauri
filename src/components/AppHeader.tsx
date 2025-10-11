import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import favicon from '../assets/favicon.png';

interface AppHeaderProps {
  onBack?: () => void;
  showBackButton?: boolean;
  titleSize?: 'large' | 'medium';
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  onBack, 
  showBackButton = false, 
  titleSize = 'medium' 
}) => {
  const titleClass = titleSize === 'large' ? 'text-4xl' : 'text-3xl';
  const iconSize = titleSize === 'large' ? 'w-16 h-16' : 'w-12 h-12';
  const iconMargin = titleSize === 'large' ? 'mr-4' : 'mr-3';

  return (
    <div className="flex items-center justify-between mb-6">
      {showBackButton && onBack ? (
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <FiArrowLeft size={20} />
        </button>
      ) : (
        <div></div>
      )}
      
      <div className="flex items-center">
        <img 
          src={favicon} 
          alt="Slab! App Icon" 
          className={`${iconSize} rounded-lg ${iconMargin}`}
        />
        <div>
          <h1 className={`${titleClass} font-bold text-gray-800`}>Slab 17</h1>
          <p className="text-sm text-gray-600 italic">the philosopher's puzzle game</p>
        </div>
      </div>
      
      {showBackButton ? (
        <div className="w-20"></div>
      ) : (
        <div></div>
      )}
    </div>
  );
};

export default AppHeader;
