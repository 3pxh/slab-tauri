import React from 'react';
import { FiBookOpen, FiX } from 'react-icons/fi';
import { analytics } from '../utils/analytics';
import favicon from '../assets/favicon.png';

interface WelcomeScreenProps {
  onStartTutorial: () => void;
  onSkip: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartTutorial, onSkip }) => {
  const handleStartTutorial = () => {
    // Navigate immediately, analytics can run in background
    onStartTutorial();
    // Fire analytics asynchronously without blocking
    setTimeout(() => analytics.tutorialViewed(), 0);
  };

  const handleSkip = () => {
    // Navigate immediately, analytics can run in background
    onSkip();
    // Fire analytics asynchronously without blocking
    setTimeout(() => analytics.tutorialSkipped(), 0);
  };

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* App Icon */}
        <div className="mb-8 flex justify-center">
          <img 
            src={favicon} 
            alt="Slab! App Icon" 
            className="w-32 h-32 rounded-lg"
          />
        </div>

        {/* Welcome Content */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to Slab!
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Slab is a daily puzzle game where each challenge offers a different perspective and a new mystery to solve.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          <button
            onClick={handleStartTutorial}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg flex items-center justify-center gap-3"
          >
            <FiBookOpen size={24} />
            <span className="text-lg font-semibold">See Tutorial</span>
          </button>

          <button
            onClick={handleSkip}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg p-6 transition-colors duration-200 flex items-center justify-center gap-3"
          >
            <FiX size={24} />
            <span className="text-lg font-semibold">Skip Tutorial</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;

