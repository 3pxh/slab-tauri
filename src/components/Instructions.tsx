import React from 'react';
import { FaLightbulb } from 'react-icons/fa6';
import { FiStar } from 'react-icons/fi';
import { FiRefreshCw, FiAward, FiCalendar, FiPlay } from 'react-icons/fi';
import Slab, { createRandomSlab } from './Slab';
import AppHeader from './AppHeader';

interface InstructionsProps {
  onFirstPuzzle: () => void;
  onTodayPuzzle: () => void;
  onHome: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({ onFirstPuzzle, onTodayPuzzle, onHome }) => {
  // Generate a random slab for demonstration
  const [randomSlab, setRandomSlab] = React.useState(() => createRandomSlab());
  
  const refreshSlab = () => {
    setRandomSlab(createRandomSlab());
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader onBack={onHome} showBackButton={true} />
      
      <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Play</h3>
      
      {/* Random slab example */}
      <div className="mb-4 text-center">
        <Slab slab={randomSlab} size="small" className="mx-auto mb-2" />
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-gray-600 italic">this is a slab</p>
          <button
            onClick={refreshSlab}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors duration-200"
            title="Generate new random slab"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center">
              <FiStar className="w-5 h-5 text-yellow-500 fill-yellow-400" />
            </div>
          </div>
          <p>There is a secret rule which marks slabs with a star. The rule can be anything, for example "the slab has no red" or "no blue is next to a yellow", or "there's no group bigger than 5 cells".</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-base font-bold">+</span>
            </div>
          </div>
          <p>Make your own slabs to see which ones are stars. Try to find the pattern by making different kinds. You get two examples to start, one star and one not.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-12 gap-1 bg-yellow-500 rounded flex flex-col items-center justify-center">
              <FaLightbulb className="w-4 h-4 text-white" />
              <span className="text-xs text-white leading-none">3/3</span>
            </div>
          </div>
          <p>When you think you know the rule, guess 5 slabs correctly to win. You can't make new slabs while a guess is in progress. You get 3 guess attempts.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
              <FiAward className="w-5 h-5 text-white" />
            </div>
          </div>
          <p>For each guess where all 5 are correct you get a trophy.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <p>There's a new puzzle every day.</p>
        </div>
      </div>
      
      {/* Try puzzle buttons */}
      <div className="mt-6 space-y-3">
        <button
          onClick={onFirstPuzzle}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg p-4 transition-colors duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-3">
            <FiPlay size={20} />
            <span className="font-semibold">Try the first puzzle</span>
          </div>
        </button>
        
        <button
          onClick={onTodayPuzzle}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 transition-colors duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-3">
            <FiPlay size={20} />
            <span className="font-semibold">Try today's puzzle</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Instructions;
