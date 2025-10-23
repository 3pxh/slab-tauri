import React from 'react';

interface DifficultyIndicatorProps {
  difficulty: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({ 
  difficulty, 
  size = 'medium',
  showTooltip = true 
}) => {
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-red-500';
      case 5: return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'w-2 h-1';
      case 'medium':
        return 'w-3 h-1.5';
      case 'large':
        return 'w-4 h-2';
      default:
        return 'w-3 h-1.5';
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: difficulty }, (_, i) => (
        <div
          key={i}
          className={`${getSizeClasses(size)} rounded-sm ${getDifficultyColor(difficulty)}`}
          title={showTooltip ? `Difficulty: ${difficulty}/5` : undefined}
        />
      ))}
    </div>
  );
};

export default DifficultyIndicator;
