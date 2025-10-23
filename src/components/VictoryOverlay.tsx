import React from 'react';
import { FiAward, FiEye, FiPlay, FiArrowRight } from 'react-icons/fi';

type VictoryOverlayProps = {
  isOpen: boolean;
  onKeepPlaying: () => void;
  onNextPuzzle: () => void;
  remainingGuesses: number;
  puzzleName: string;
  ruleDescription: string;
};

const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  isOpen,
  onKeepPlaying,
  onNextPuzzle,
  remainingGuesses,
  puzzleName,
  ruleDescription
}) => {
  const [showRule, setShowRule] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in-0 zoom-in-95 duration-300">
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Congratulations!</h1>
          <p className="text-lg text-gray-600">You solved "{puzzleName}"!</p>
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
          
          <button
            onClick={onKeepPlaying}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FiPlay size={20} />
            Keep Playing
          </button>
          
          <button
            onClick={onNextPuzzle}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FiArrowRight size={20} />
            Next Puzzle
          </button>
        </div>

        {/* Remaining Guesses Text */}
        {remainingGuesses > 0 && !showRule && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            You still have {remainingGuesses} guess{remainingGuesses !== 1 ? 'es' : ''} left. 
            You can check if it's really your rule or if you got lucky by guessing more before revealing the rule.
          </div>
        )}
      </div>
    </div>
  );
};

export default VictoryOverlay;
