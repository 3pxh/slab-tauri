import React from 'react';
import { FiAward, FiEye, FiArrowRight, FiArchive, FiX } from 'react-icons/fi';

type VictoryOverlayProps = {
  isOpen: boolean;
  onKeepPlaying: () => void;
  onNextPuzzle: () => void;
  onGoToArchive: () => void;
  remainingGuesses: number;
  puzzleName: string;
  ruleDescription: string;
  hasNextPuzzle: boolean;
  solvedPuzzlesCount?: number;
  slabsCount?: number;
  maxGuesses?: number;
  trophies?: number;
  hasWon?: boolean;
  totalCorrect?: number | null;
  attempts?: number;
};

const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  isOpen,
  onKeepPlaying,
  onNextPuzzle,
  onGoToArchive,
  remainingGuesses,
  puzzleName,
  ruleDescription,
  hasNextPuzzle,
  solvedPuzzlesCount,
  slabsCount,
  maxGuesses = 3,
  trophies = 0,
  hasWon = false,
  totalCorrect = null,
  attempts = 0
}) => {
  const [showRule, setShowRule] = React.useState(false);

  if (!isOpen) return null;

  const hasRemainingGuesses = remainingGuesses > 0;
  const didNotWin = !hasWon && remainingGuesses === 0;
  const maxPossible = attempts > 0 ? 5 * attempts : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in-0 zoom-in-95 duration-300 relative">
        {/* Close Button */}
        <button
          onClick={onKeepPlaying}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
          aria-label="Close"
        >
          <FiX size={24} />
        </button>

        {hasRemainingGuesses ? (
          /* Content when there are remaining guesses */
          <>
            {/* Celebration Animation */}
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <FiAward className="text-yellow-500 fill-yellow-300" size={64} />
                  {/* Celebration particles */}
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="absolute -top-1 -left-2 w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                You got a victory badge!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Can you get the rest?
              </p>
            </div>

            {/* Keep Guessing Button */}
            <div className="space-y-3">
              <button
                onClick={onKeepPlaying}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FiArrowRight size={20} />
                Keep Guessing
              </button>
            </div>
          </>
        ) : didNotWin ? (
          /* Content when they didn't win and have no remaining guesses */
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Better luck next time</h1>
              <p className="text-lg text-gray-600 mb-4">
                You've used all your guesses for {puzzleName}
              </p>
              {totalCorrect !== null && totalCorrect !== undefined && maxPossible > 0 && (
                <p className="text-lg text-gray-600 mb-6">
                  You got {totalCorrect} of {maxPossible} slabs correct
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {!showRule ? (
                <button
                  onClick={() => setShowRule(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FiEye size={20} />
                  Reveal Rule
                </button>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">The Rule</h3>
                  <div className="text-sm text-blue-700 leading-relaxed">
                    {ruleDescription || "No rule description available."}
                  </div>
                </div>
              )}
              
              {hasNextPuzzle && (
                <button
                  onClick={onNextPuzzle}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FiArrowRight size={20} />
                  Next Puzzle
                </button>
              )}
              
              <button
                onClick={onGoToArchive}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FiArchive size={20} />
                View Archive
              </button>
            </div>
          </>
        ) : (
          /* Original content when no remaining guesses and they won */
          <>
            {/* Celebration Animation */}
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <FiAward className="text-yellow-500 fill-yellow-300" size={64} />
                  {/* Celebration particles */}
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="absolute -top-1 -left-2 w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Congratulations</h1>
              <p className="text-lg text-gray-600">
                You solved {puzzleName}
                {slabsCount !== undefined && ` with ${slabsCount} slab${slabsCount !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Solved Puzzles Count */}
            {solvedPuzzlesCount !== undefined && (
              <div className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3 mb-6 border border-yellow-200">
                <span className="font-semibold">You've solved {solvedPuzzlesCount} puzzle{solvedPuzzlesCount !== 1 ? 's' : ''}!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {!showRule ? (
                <button
                  onClick={() => setShowRule(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FiEye size={20} />
                  Reveal Rule
                </button>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">The Rule</h3>
                  <div className="text-sm text-blue-700 leading-relaxed">
                    {ruleDescription || "No rule description available."}
                  </div>
                </div>
              )}
              
              {hasNextPuzzle && (
                <button
                  onClick={onNextPuzzle}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FiArrowRight size={20} />
                  Next Puzzle
                </button>
              )}
              
              <button
                onClick={onGoToArchive}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FiArchive size={20} />
                View Archive
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VictoryOverlay;

