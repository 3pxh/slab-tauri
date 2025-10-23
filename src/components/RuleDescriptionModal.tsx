import React from 'react';
import { FiX } from 'react-icons/fi';

type RuleDescriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ruleDescription: string;
  puzzleName: string;
  remainingGuesses: number;
};

const RuleDescriptionModal: React.FC<RuleDescriptionModalProps> = ({
  isOpen,
  onClose,
  ruleDescription,
  puzzleName,
  remainingGuesses
}) => {
  const [isRevealed, setIsRevealed] = React.useState(false);

  // Reset revealed state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsRevealed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {puzzleName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {!isRevealed ? (
            <div className="text-center">
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Would you like to see the secret rule?
                </p>
                {remainingGuesses > 0 && (
                  <p className="text-gray-500 text-sm">
                    You still have {remainingGuesses} guess{remainingGuesses !== 1 ? 'es' : ''} left. 
                    You can check if it's really your rule or if you got lucky by guessing more before revealing the rule.
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsRevealed(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Reveal rule
              </button>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {ruleDescription}
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default RuleDescriptionModal;
