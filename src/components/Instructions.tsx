import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Play</h3>
      
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <div className="relative w-6 h-6">
              <div className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full z-10" style={{ left: '0px', top: '0px' }}></div>
              <div className="absolute w-4 h-4 bg-black rounded-full" style={{ left: '8px', top: '8px' }}></div>
            </div>
          </div>
          <p>There is a hidden rule which marks slabs as black or white. (e.g. "no red squares")</p>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">+</span>
            </div>
          </div>
          <p>Create slabs to see how they follow the rule.</p>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p>Guess 5 slabs correctly to win. You can't make slabs until you finish a guess.</p>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-700 text-xs font-bold">3/3</span>
            </div>
          </div>
          <p>You can guess 3 times.</p>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
