import React from 'react';
import { FiCalendar, FiPlus, FiPlay, FiHelpCircle } from 'react-icons/fi';
import favicon from '../assets/favicon.png';

interface HomeProps {
  onTodayPuzzle: () => void;
  onArchive: () => void;
  onCreatePuzzle: () => void;
  onInstructions: () => void;
}

const Home: React.FC<HomeProps> = ({ onTodayPuzzle, onArchive, onCreatePuzzle, onInstructions }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <div className="flex items-center justify-center mb-8">
        <img 
          src={favicon} 
          alt="Slab! App Icon" 
          className="w-16 h-16 rounded-lg mr-4"
        />
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Slab 17</h1>
          <p className="text-sm text-gray-600 italic">a formal imagining</p>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="space-y-4">
        {/* Today's Puzzle Button */}
        <button
          onClick={onTodayPuzzle}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiPlay size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Today's Puzzle</div>
              <div className="text-sm opacity-90">Play the daily challenge</div>
            </div>
          </div>
        </button>

        {/* Instructions Button */}
        <button
          onClick={onInstructions}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiHelpCircle size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">How to Play</div>
              <div className="text-sm opacity-90">Learn the rules</div>
            </div>
          </div>
        </button>

        {/* Archive Button */}
        <button
          onClick={onArchive}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiCalendar size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Archive</div>
              <div className="text-sm opacity-90">Browse past puzzles</div>
            </div>
          </div>
        </button>

        {/* Make a Puzzle Button */}
        <button
          onClick={onCreatePuzzle}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiPlus size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Make a Puzzle</div>
              <div className="text-sm opacity-90">Entertain a friend</div>
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
      <p className="text-xs text-gray-600 text-center">
          Follow along on{' '}
          <a 
            href="https://bsky.app/profile/slab17.bsky.social" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Bluesky
          </a>
          {' '}or reach out to{' '}
          hi at slab17 ɗоt com
        </p>
      </div>
    </div>
  );
};

export default Home;
