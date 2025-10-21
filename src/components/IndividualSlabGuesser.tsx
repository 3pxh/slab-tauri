import React from 'react';
import { FiStar, FiX, FiArrowRight, FiCheck, FiAward } from 'react-icons/fi';
import { SlabData } from './Slab';
import Slab from './Slab';

type IndividualSlabGuesserProps = {
  currentSlab: SlabData;
  currentIndex: number;
  totalSlabs: number;
  correctCount: number;
  incorrectCount: number;
  onGuessSubmit: (isStar: boolean) => Promise<boolean>;
  onProceedToNext: () => Promise<void>;
  onWinNext: () => Promise<void>;
  colors: string[];
  colorblindMode: 'none' | 'icon' | 'number' | 'letter';
  getColorblindOverlay: (colorIndex: number) => string | null;
  levelAttempts: number;
};

const IndividualSlabGuesser: React.FC<IndividualSlabGuesserProps> = ({
  currentSlab,
  currentIndex,
  totalSlabs,
  correctCount,
  incorrectCount,
  onGuessSubmit,
  onProceedToNext,
  onWinNext,
  colors,
  colorblindMode,
  getColorblindOverlay,
  levelAttempts
}) => {
  const [selectedGuess, setSelectedGuess] = React.useState<'star' | 'not-star' | null>(null);
  const [guessSubmitted, setGuessSubmitted] = React.useState(false);
  const [guessResult, setGuessResult] = React.useState<boolean | null>(null);

  // Reset selection when slab changes
  React.useEffect(() => {
    setSelectedGuess(null);
    setGuessSubmitted(false);
    setGuessResult(null);
  }, [currentSlab]);

  const handleGuessSelect = (guess: 'star' | 'not-star') => {
    // If clicking the already selected button, deselect it
    if (selectedGuess === guess) {
      setSelectedGuess(null);
    } else {
      setSelectedGuess(guess);
    }
  };

  const handleSubmit = async () => {
    // If we're in the final results state, just close the session
    if (currentIndex >= totalSlabs) {
      await onWinNext();
      return;
    }
    
    // Otherwise, handle normal guess flow
    if (selectedGuess === null) return;
    
    if (!guessSubmitted) {
      // First submit - show the result
      setGuessSubmitted(true);
      
      // Submit the guess and get the result
      const result = await onGuessSubmit(selectedGuess === 'star');
      setGuessResult(result);
    } else {
      // Second submit - proceed to next slab
      await onProceedToNext();
    }
  };

  const progressText = `${currentIndex + 1} of ${totalSlabs}`;
  const scoreText = `✓ ${correctCount} ✗ ${incorrectCount}`;
  const guessAttemptNumber = levelAttempts + 1;

  return (
    <div className="p-4 w-full max-w-md mx-auto">
      {/* Guess attempt and score indicators */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
        <span>Guess Attempt #{guessAttemptNumber}</span>
        <span>{scoreText}</span>
      </div>

      {/* Current slab display or final results */}
      <div className="flex justify-center mb-2">
        {currentIndex >= totalSlabs ? (
          /* Final results panel */
          <div className={`w-48 h-48 flex items-center justify-center rounded-lg shadow-lg ${
            correctCount === totalSlabs 
              ? 'bg-yellow-500' 
              : 'bg-gray-500'
          }`}>
            <div className="text-center">
              {correctCount === totalSlabs ? (
                /* Win state */
                <>
                  <div className="flex justify-center mb-2">
                    <FiAward className="text-white fill-yellow-300" size={48} />
                  </div>
                  <div className="text-2xl font-bold text-white">You Win!</div>
                </>
              ) : (
                /* Results state */
                <>
                  <div className="text-4xl font-bold text-white mb-2">
                    {correctCount}/{totalSlabs}
                  </div>
                  <div className="text-lg text-white">
                    Correct
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Normal slab display */
          <div className="w-48 h-48">
            <Slab 
              slab={currentSlab} 
              size="medium" 
              className="w-full h-full" 
              colors={colors}
              colorblindMode={colorblindMode}
              getColorblindOverlay={getColorblindOverlay}
            />
          </div>
        )}
      </div>

      {/* Progress indicator below slab - only show when not in final results */}
      {currentIndex < totalSlabs && (
        <div className="flex justify-center mb-6 text-sm text-gray-600">
          <span>{progressText}</span>
        </div>
      )}

      {/* Guess buttons and submit button inline */}
      {currentIndex >= totalSlabs ? (
        /* Final results state - only show next button */
        <div className="flex justify-center items-center mb-6">
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-blue-500 text-white hover:bg-blue-600 hover:scale-105"
            onClick={handleSubmit}
            title="Continue"
          >
            <FiArrowRight size={20} />
          </button>
        </div>
      ) : (
        /* Normal state - show all buttons */
        <div className="flex justify-center items-center gap-4 mb-6">
          {/* Not star button */}
          <button
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              selectedGuess === 'not-star' 
                ? 'bg-red-300 border-4 border-red-400 shadow-xl scale-110' 
                : selectedGuess === 'star'
                  ? 'bg-gray-200 border-2 border-gray-300'
                  : 'bg-red-100 border-2 border-red-300 hover:border-red-400 hover:bg-red-200 hover:scale-105'
            }`}
            onClick={() => handleGuessSelect('not-star')}
            disabled={guessSubmitted}
            title="Guess: This is not a star"
          >
            <FiX 
              size={24} 
              className={selectedGuess === 'not-star' ? 'text-red-800' : selectedGuess === 'star' ? 'text-gray-400' : 'text-red-600'} 
            />
          </button>

          {/* Submit/Proceed button */}
          <button
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${
              selectedGuess !== null
                ? guessSubmitted 
                  ? guessResult 
                    ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-105' 
                    : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                : 'bg-gray-400 text-white cursor-not-allowed opacity-0'
            }`}
            onClick={handleSubmit}
            disabled={selectedGuess === null}
            title={guessSubmitted ? "Proceed to next slab" : "Submit your guess"}
          >
            <FiArrowRight size={20} />
            {/* Visual indicator for correct/incorrect */}
            {guessSubmitted && guessResult !== null && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold">
                {guessResult ? (
                  <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <FiCheck size={10} className="text-green-500" />
                  </div>
                ) : (
                  <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <FiX size={10} className="text-red-500" />
                  </div>
                )}
              </div>
            )}
          </button>

          {/* Star button */}
          <button
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              selectedGuess === 'star' 
                ? 'bg-yellow-300 border-4 border-yellow-400 shadow-xl scale-110' 
                : selectedGuess === 'not-star'
                  ? 'bg-gray-200 border-2 border-gray-300'
                  : 'bg-yellow-100 border-2 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-200 hover:scale-105'
            }`}
            onClick={() => handleGuessSelect('star')}
            disabled={guessSubmitted}
            title="Guess: This is a star"
          >
            <FiStar 
              size={24} 
              className={selectedGuess === 'star' ? 'text-yellow-800 fill-yellow-800' : selectedGuess === 'not-star' ? 'text-gray-400' : 'text-yellow-600'} 
            />
          </button>
        </div>
      )}

    </div>
  );
};

export default IndividualSlabGuesser;
