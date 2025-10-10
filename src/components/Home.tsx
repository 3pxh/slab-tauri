import React from 'react';
import { FiCalendar, FiPlus, FiPlay } from 'react-icons/fi';
import favicon from '../assets/favicon.png';

interface HomeProps {
  onTodayPuzzle: () => void;
  onArchive: () => void;
  onCreatePuzzle: () => void;
}

const Home: React.FC<HomeProps> = ({ onTodayPuzzle, onArchive, onCreatePuzzle }) => {
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
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 flex items-center justify-center space-x-3 transition-colors duration-200 shadow-lg"
        >
          <FiPlay size={24} />
          <div className="text-left">
            <div className="text-lg font-semibold">Today's Puzzle</div>
            <div className="text-sm opacity-90">Play the daily challenge</div>
          </div>
        </button>

        {/* Archive Button */}
        <button
          onClick={onArchive}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg p-6 flex items-center justify-center space-x-3 transition-colors duration-200 shadow-lg"
        >
          <FiCalendar size={24} />
          <div className="text-left">
            <div className="text-lg font-semibold">Archive</div>
            <div className="text-sm opacity-70">Browse past puzzles</div>
          </div>
        </button>

        {/* Make a Puzzle Button */}
        <button
          onClick={onCreatePuzzle}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 flex items-center justify-center space-x-3 transition-colors duration-200 shadow-lg"
        >
          <FiPlus size={24} />
          <div className="text-left">
            <div className="text-lg font-semibold">Make a Puzzle</div>
            <div className="text-sm opacity-90">Create your own challenge</div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Choose your adventure</p>
      </div>
    </div>
  );
};

export default Home;
