import React from 'react';
import { FiArrowRight, FiCheck, FiX, FiAward } from 'react-icons/fi';
import { FaLightbulb } from 'react-icons/fa6';
import { GiPlasticDuck } from 'react-icons/gi';
import { analytics } from '../utils/analytics';

export type GuessResult = {
  index: number;
  isDuck: boolean;
  isCorrect: boolean;
};

export type GuessPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  remainingGuesses: number;
  maxGuesses: number;
  children: React.ReactNode[];
  onGuessSubmit: (results: GuessResult[]) => void;
  groundTruth?: boolean[]; // Array indicating which items are ducks (true) or not (false)
  showSuccess?: boolean;
  emptyMessage?: string;
  puzzle?: any; // Add puzzle prop for analytics
};

const GuessPanel: React.FC<GuessPanelProps> = ({
  isOpen,
  onClose,
  remainingGuesses,
  maxGuesses,
  children,
  onGuessSubmit,
  groundTruth = [],
  showSuccess = false,
  emptyMessage = "No items available to guess on.",
  puzzle
}) => {
  const [guesses, setGuesses] = React.useState<{ [key: number]: 'white' | 'black' | null }>({});
  const [guessResults, setGuessResults] = React.useState<{ [key: number]: boolean | null }>({});
  const [guessesSubmitted, setGuessesSubmitted] = React.useState(false);

  // Reset state when panel opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setGuesses({});
      setGuessResults({});
      setGuessesSubmitted(false);
    }
  }, [isOpen]);

  const handleGuessSelect = (index: number) => {
    setGuesses(prev => ({
      ...prev,
      [index]: prev[index] === 'black' ? 'white' : 'black'
    }));
    // Clear any previous results when making a new guess
    setGuessResults(prev => ({
      ...prev,
      [index]: null
    }));
  };

  const handleSubmitGuesses = () => {
    const results: GuessResult[] = [];
    let hasAnyGuess = false;

    children.forEach((_, index) => {
      const guess = guesses[index];
      // Default to 'white' (not duck) if no guess is made
      const actualGuess = guess || 'white';
      hasAnyGuess = true;
      
      // Use ground truth to determine if the guess is correct
      const isDuck = actualGuess === 'black';
      const actualResult = groundTruth[index] || false;
      const isCorrect = (isDuck && actualResult) || (!isDuck && !actualResult);
      
      results.push({
        index,
        isDuck,
        isCorrect
      });
    });

    // Only process if there are actual guesses made
    if (hasAnyGuess) {
      // Track analytics for each guess
      if (puzzle) {
        results.forEach((result) => {
          analytics.guessMade(puzzle, maxGuesses - remainingGuesses + 1, result.isCorrect);
        });
      }
      
      onGuessSubmit(results);
      setGuessesSubmitted(true);
      
      // Update guess results for feedback display
      const feedbackResults: { [key: number]: boolean } = {};
      results.forEach(result => {
        feedbackResults[result.index] = result.isCorrect;
      });
      setGuessResults(feedbackResults);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Check if all guesses are correct
  const allGuessesCorrect = React.useMemo(() => {
    if (!guessesSubmitted || Object.keys(guessResults).length === 0) {
      return false;
    }
    return Object.values(guessResults).every(result => result === true);
  }, [guessesSubmitted, guessResults]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-2">
            <FaLightbulb size={20} />
            <span className="text-lg font-semibold">{remainingGuesses}/{maxGuesses}</span>
          </div>
          <button
            className="p-2 rounded text-sm hover:bg-gray-100"
            onClick={handleClose}
            title="Close"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {showSuccess && (
          <div className="mx-6 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            🎉 Congratulations! All your guesses are correct!
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-0">
            {children.map((child, index) => {
              const currentGuess = guesses[index] || 'white'; // Default to 'white' (not duck)
              const result = guessResults[index];
              const isIncorrect = result === false;
              const hasBeenSubmitted = result !== null && result !== undefined;
              const totalItems = children.length;
              const isLastItem = index === totalItems - 1;
              const isOddTotal = totalItems % 2 === 1;
              const shouldSpanFullWidth = isLastItem && isOddTotal;
              
              return (
                <div 
                  key={index} 
                  className={`border-r border-gray-200 ${!isLastItem ? 'border-b' : ''} ${shouldSpanFullWidth ? 'col-span-2' : ''} ${isLastItem && !shouldSpanFullWidth ? 'last:border-r-0' : ''}`}
                >
                  <div className="relative flex flex-col items-center justify-center p-6 h-full">
                    <div className="flex flex-col items-center gap-4">
                      {/* Child content */}
                      <div className="w-32 h-32 relative">
                        {child}
                        {/* Duck annotation for all ducks - always present but with opacity transition */}
                        {groundTruth[index] && (
                          <div 
                            className={`absolute transition-opacity duration-500 ${
                              hasBeenSubmitted ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{
                              top: '-4px',
                              right: '-4px',
                              color: '#000000',
                              filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                            }}
                          >
                            <GiPlasticDuck size={16} />
                          </div>
                        )}
                      </div>
                      
                      {/* Duck Guess Button */}
                      <div className="relative">
                        <button
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            currentGuess === 'black' 
                              ? 'bg-yellow-300 border-4 border-yellow-300 shadow-xl' 
                              : 'bg-gray-200 border-2 border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => handleGuessSelect(index)}
                          title={currentGuess === 'black' ? "Guess: Duck (True)" : "Guess: Not Duck (False)"}
                        >
                          <GiPlasticDuck 
                            size={20} 
                            className={currentGuess === 'black' ? 'text-black' : 'text-gray-500'} 
                          />
                        </button>
                        {/* Red X for wrong guesses - always present but with opacity transition */}
                         <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 pointer-events-none ${
                           (hasBeenSubmitted && isIncorrect) ? 'opacity-100' : 'opacity-0'
                         }`}>
                          <FiX 
                            size={32} 
                            className="text-red-600 font-bold stroke-2" 
                            style={{
                              filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {children.length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-8">
                {emptyMessage}
              </div>
            )}
          </div>
          
          {/* Submit/Close Button - now inside scrollable area */}
          {children.length > 0 && (
            <div className="p-6 border-t">
              <div className="flex justify-center">
              {guessesSubmitted ? (
                <button
                  className="px-6 py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 flex items-center gap-2"
                  onClick={handleClose}
                  title="Close"
                >
                  {allGuessesCorrect ? (
                    <>
                      <FiAward className="text-yellow-500" size={20} />
                      <FiAward className="text-yellow-500" size={20} />
                      <FiAward className="text-yellow-500" size={20} />
                    </>
                  ) : (
                    <FiArrowRight size={20} />
                  )}
                </button>
              ) : (
                <button
                  className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                    children.length > 0
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                  onClick={handleSubmitGuesses}
                  disabled={children.length === 0}
                  title={
                    children.length > 0
                      ? "Submit your guesses"
                      : "No items to guess"
                  }
                >
                  {children.length > 0 ? (
                    <>
                      <FiCheck size={20} />
                      <span>Submit</span>
                    </>
                  ) : (
                    <span>
                      No items to guess
                    </span>
                  )}
                </button>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuessPanel;
