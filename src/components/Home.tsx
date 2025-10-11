import React from 'react';
import { FiCalendar, FiPlus, FiPlay, FiHelpCircle, FiMail } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import AppHeader from './AppHeader';
import { analytics } from '../utils/analytics';

interface HomeProps {
  onTodayPuzzle: () => void;
  onArchive: () => void;
  onCreatePuzzle: () => void;
  onInstructions: () => void;
}

const Home: React.FC<HomeProps> = ({ onTodayPuzzle, onArchive, onCreatePuzzle, onInstructions }) => {
  const { isAnonymous, linkAccountWithEmail, isAuthenticated } = useAuth();
  
  // Debug logging and analytics
  React.useEffect(() => {
    console.log('🏠 Home component auth state:', { isAuthenticated, isAnonymous });
    analytics.homeViewed();
  }, [isAuthenticated, isAnonymous]);
  const [showLinkAccount, setShowLinkAccount] = React.useState(false);
  const [linkEmail, setLinkEmail] = React.useState('');
  const [linkMessage, setLinkMessage] = React.useState('');
  const [isLinking, setIsLinking] = React.useState(false);

  const handleLinkAccount = async () => {
    if (!linkEmail.trim()) {
      setLinkMessage('Please enter an email address');
      return;
    }

    setIsLinking(true);
    setLinkMessage('');
    
    try {
      const result = await linkAccountWithEmail(linkEmail.trim());
      setLinkMessage(result.message);
      
      if (result.success) {
        analytics.accountLinked();
        setShowLinkAccount(false);
        setLinkEmail('');
      }
    } catch (error) {
      setLinkMessage(`Failed to link account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader titleSize="large" />

      {/* Main Action Buttons */}
      <div className="space-y-4">
        {/* Today's Puzzle Button */}
        <button
          onClick={() => {
            analytics.puzzleStarted({ id: 'daily', name: "Today's Puzzle", publish_date: new Date().toISOString().split('T')[0], is_daily: true } as any);
            onTodayPuzzle();
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiPlay size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Today's Puzzle</div>
              <div className="text-sm opacity-90">Play the daily challenge</div>
            </div>
          </div>
        </button>

        {/* Instructions Button */}
        <button
          onClick={() => {
            analytics.instructionsViewed();
            onInstructions();
          }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiHelpCircle size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">How to Play</div>
              <div className="text-sm opacity-90">Learn the rules</div>
            </div>
          </div>
        </button>

        {/* Archive Button */}
        <button
          onClick={() => {
            analytics.archiveViewed();
            onArchive();
          }}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiCalendar size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Archive</div>
              <div className="text-sm opacity-90">Browse past puzzles</div>
            </div>
          </div>
        </button>

        {/* Make a Puzzle Button */}
        <button
          onClick={() => {
            analytics.puzzleCreatorViewed();
            onCreatePuzzle();
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiPlus size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Make a Puzzle</div>
              <div className="text-sm opacity-90">Entertain a friend</div>
            </div>
          </div>
        </button>
      </div>

      {/* Save Progress Link - only show for anonymous users */}
      {isAuthenticated && isAnonymous && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowLinkAccount(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center justify-center gap-1 mx-auto"
          >
            <FiMail size={14} />
            Save your progress
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
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
          hi at slab17 ɗоt com
        </p>
      </div>

      {/* Account Linking Modal */}
      {showLinkAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <FiMail size={20} />
              <h3 className="text-lg font-semibold">Save Your Progress</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Add an email address to save your progress permanently. You can continue playing as an anonymous user, 
              but linking an email will preserve your progress across devices.
            </p>
            <div className="mb-4">
              <input
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLinking}
              />
            </div>
            {linkMessage && (
              <div className={`mb-4 p-3 rounded-md text-sm ${
                linkMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {linkMessage}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleLinkAccount}
                disabled={isLinking || !linkEmail.trim()}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLinking ? 'Linking...' : 'Link Account'}
              </button>
              <button
                onClick={() => {
                  setShowLinkAccount(false);
                  setLinkEmail('');
                  setLinkMessage('');
                }}
                disabled={isLinking}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
