import React from 'react';
import { FaLightbulb } from 'react-icons/fa6';
import { GiPlasticDuck } from 'react-icons/gi';

const Instructions: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Play</h3>
      
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-white border border-gray-300 rounded flex items-center justify-center">
              <GiPlasticDuck className="w-4 h-4 text-black" />
            </div>
          </div>
          <p>There is a hidden rule which marks slabs as a duck. You get two examples to start.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">+</span>
            </div>
          </div>
          <p>Make your own slabs to see which ones are ducks.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center">
              <FaLightbulb className="w-4 h-4 text-white" />
            </div>
          </div>
          <p>Guess 5 slabs correctly to win. You can't make slabs while a guess is in progress.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-700 text-xs font-bold">3/3</span>
            </div>
          </div>
          <p>You can guess 3 times.</p>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200">
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
          hi åt slab17 döt com
        </p>
      </div>
    </div>
  );
};

export default Instructions;
