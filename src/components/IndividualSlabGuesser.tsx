import React from 'react';
import { FiStar, FiX, FiArrowRight, FiCheck } from 'react-icons/fi';
import { SlabData } from './Slab';
import Slab from './Slab';
import '../slabAnimations.css';

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
  isCurrentSlabStar: boolean;
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
  levelAttempts,
  isCurrentSlabStar
}) => {
  const [selectedGuess, setSelectedGuess] = React.useState<'star' | 'not-star' | null>(null);
  const [guessSubmitted, setGuessSubmitted] = React.useState(false);
  const [guessResult, setGuessResult] = React.useState<boolean | null>(null);
  const [showAnimation, setShowAnimation] = React.useState(false);

  // Reset selection when slab changes
  React.useEffect(() => {
    setSelectedGuess(null);
    setGuessSubmitted(false);
    setGuessResult(null);
    setShowAnimation(false);
  }, [currentSlab]);

  // Trigger animation when guess result is set
  React.useEffect(() => {
    if (guessResult !== null) {
      setShowAnimation(true);
      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setShowAnimation(false);
      }, 800); // Match the longest animation duration
      return () => clearTimeout(timer);
    }
  }, [guessResult]);

  const handleGuessSelect = async (guess: 'star' | 'not-star') => {
    // If we're in the final results state, just close the session
    if (currentIndex >= totalSlabs) {
      await onWinNext();
      return;
    }
    
    // If already submitted, don't do anything (use the next button instead)
    if (guessSubmitted) {
      return;
    }
    
    // If we have incorrect attempts, skip the guessing step
    if (incorrectCount >= 1) {
      return;
    }
    
    // Immediately submit the guess and show result
    setSelectedGuess(guess);
    setGuessSubmitted(true);
    
    // Submit the guess and get the result
    const result = await onGuessSubmit(guess === 'star');
    setGuessResult(result);
  };

  const handleSubmit = async () => {
    // If we're in the final results state, just close the session
    if (currentIndex >= totalSlabs) {
      await onWinNext();
      return;
    }
    
    // If we have a submitted guess OR we're skipping the guess step, proceed to next
    if (guessSubmitted || incorrectCount >= 1) {
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
              <div className="text-4xl font-bold text-white mb-2">
                {correctCount}/{totalSlabs}
              </div>
              <div className="text-lg text-white">
                Correct
              </div>
            </div>
          </div>
        ) : (
          /* Normal slab display with result overlay */
          <div className={`w-48 h-48 relative ${showAnimation ? (guessResult ? 'slab-sparkle' : 'slab-shake') : ''}`}>
            <Slab 
              slab={currentSlab} 
              size="medium" 
              className="w-full h-full" 
              colors={colors}
              colorblindMode={colorblindMode}
              getColorblindOverlay={getColorblindOverlay}
            />
            {/* Result overlay - show when guess is submitted OR when skipping guess step */}
            {((guessSubmitted && guessResult !== null) || (incorrectCount >= 1 && !guessSubmitted)) && (
              <div className="absolute -top-4 -right-4 pointer-events-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                  // Show star if: (user guessed star AND was correct) OR (user guessed not-star AND was wrong) OR (skipping and slab is a star)
                  (selectedGuess === 'star' && guessResult) || (selectedGuess === 'not-star' && !guessResult) || (incorrectCount >= 1 && isCurrentSlabStar)
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {(selectedGuess === 'star' && guessResult) || (selectedGuess === 'not-star' && !guessResult) || (incorrectCount >= 1 && isCurrentSlabStar) ? (
                    <FiStar size={16} className="fill-current" />
                  ) : (
                    <FiX size={16} />
                  )}
                </div>
              </div>
            )}
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
        /* Normal state - show buttons based on state */
        <div className="flex justify-center items-center gap-4 mb-6">
          {incorrectCount >= 1 ? (
            /* Show progress arrow when skipping guess step */
            <button
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all bg-blue-500 text-white hover:bg-blue-600 hover:scale-105"
              onClick={handleSubmit}
              title="Proceed to next slab"
            >
              <FiArrowRight size={24} />
            </button>
          ) : !guessSubmitted ? (
            /* Show guess buttons when not submitted and no incorrect attempts */
            <>
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
                title="Guess: This is not a star"
              >
                <FiX 
                  size={24} 
                  className={selectedGuess === 'not-star' ? 'text-red-800' : selectedGuess === 'star' ? 'text-gray-400' : 'text-red-600'} 
                />
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
                title="Guess: This is a star"
              >
                <FiStar 
                  size={24} 
                  className={selectedGuess === 'star' ? 'text-yellow-800 fill-yellow-800' : selectedGuess === 'not-star' ? 'text-gray-400' : 'text-yellow-600'} 
                />
              </button>
            </>
          ) : (
            /* Show next button with result feedback when submitted */
            <button
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all relative ${
                guessResult 
                  ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-105' 
                  : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
              }`}
              onClick={handleSubmit}
              title="Proceed to next slab"
            >
              <FiArrowRight size={24} />
              {/* Visual indicator for correct/incorrect */}
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white">
                {guessResult ? (
                  <FiCheck size={16} className="text-green-500" />
                ) : (
                  <FiX size={16} className="text-red-500" />
                )}
              </div>
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default IndividualSlabGuesser;
