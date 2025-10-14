import React from 'react';
import { FiCalendar, FiPlus, FiPlay, FiMail, FiBell } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import AppHeader from './AppHeader';
import { analytics } from '../utils/analytics';
import { signupForLaunch, getPuzzle, Puzzle } from '../lib/supabase';

interface HomeProps {
  onTodayPuzzle: () => void;
  onArchive: () => void;
  onCreatePuzzle: () => void;
  onTutorial: () => void;
}

const Home: React.FC<HomeProps> = ({ onTodayPuzzle, onArchive, onCreatePuzzle, onTutorial }) => {
  const { isAnonymous, linkAccountWithEmail, isAuthenticated } = useAuth();
  
  // State for today's puzzle
  const [todaysPuzzle, setTodaysPuzzle] = React.useState<Puzzle | null>(null);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = React.useState(true);
  const [puzzleError, setPuzzleError] = React.useState<string | null>(null);
  
  // Debug logging and analytics
  React.useEffect(() => {
    console.log('🏠 Home component auth state:', { isAuthenticated, isAnonymous });
    analytics.homeViewed();
  }, [isAuthenticated, isAnonymous]);

  // Fetch today's puzzle name
  React.useEffect(() => {
    const fetchTodaysPuzzle = async () => {
      try {
        setIsLoadingPuzzle(true);
        setPuzzleError(null);
        
        // Get today's date in UTC
        const today = new Date();
        const year = today.getUTCFullYear();
        const month = today.getUTCMonth();
        const day = today.getUTCDate();
        
        // Create timestamp for end of today (23:59:59.999) in UTC
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        const timestamp = endOfDay.toISOString();
        
        const response = await getPuzzle(timestamp);
        setTodaysPuzzle(response.puzzle);
      } catch (error) {
        console.error('Error loading today\'s puzzle:', error);
        setPuzzleError(error instanceof Error ? error.message : 'Failed to load today\'s puzzle');
      } finally {
        setIsLoadingPuzzle(false);
      }
    };

    fetchTodaysPuzzle();
  }, []);

  // Check if user has already signed up for email notifications
  React.useEffect(() => {
    const hasSignedUpForLaunch = localStorage.getItem('slab_email_signup');
    if (hasSignedUpForLaunch === 'true') {
      setHasSignedUp(true);
    }
  }, []);
  const [showLinkAccount, setShowLinkAccount] = React.useState(false);
  const [linkEmail, setLinkEmail] = React.useState('');
  const [linkMessage, setLinkMessage] = React.useState('');
  const [isLinking, setIsLinking] = React.useState(false);
  
  // Email signup state
  const [showEmailSignup, setShowEmailSignup] = React.useState(false);
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupMessage, setSignupMessage] = React.useState('');
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [hasSignedUp, setHasSignedUp] = React.useState(false);

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

  const handleEmailSignup = async () => {
    if (!signupEmail.trim()) {
      setSignupMessage('Please enter an email address');
      return;
    }

    setIsSigningUp(true);
    setSignupMessage('');
    
    try {
      const result = await signupForLaunch(signupEmail.trim());
      setSignupMessage(result.message);
      
      if (result.success) {
        analytics.emailSignupCompleted();
        setShowEmailSignup(false);
        setSignupEmail('');
        setHasSignedUp(true);
        // Remember in localStorage that user has signed up
        localStorage.setItem('slab_email_signup', 'true');
      }
    } catch (error) {
      setSignupMessage(`Failed to sign up: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSigningUp(false);
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
            analytics.puzzleStarted({ 
              id: todaysPuzzle?.id || 'daily', 
              name: todaysPuzzle?.name || "Today's Puzzle", 
              publish_date: new Date().toISOString().split('T')[0], 
              is_daily: true 
            } as any);
            onTodayPuzzle();
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
          disabled={isLoadingPuzzle}
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiPlay size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">
                {isLoadingPuzzle ? 'Loading puzzle...' :`Today: '${todaysPuzzle?.name}'` || "Today's Puzzle"}
              </div>
              <div className="text-sm opacity-90">
                {puzzleError ? 'Unable to load puzzle name' : 'Play the daily puzzle'}
              </div>
            </div>
          </div>
        </button>

        {/* Tutorial Button */}
        <button
          onClick={() => {
            analytics.tutorialViewed();
            onTutorial();
          }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-6 transition-colors duration-200 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex justify-end">
              <FiPlay size={24} />
            </div>
            <div className="col-span-2 text-left">
              <div className="text-lg font-semibold">Tutorial</div>
              <div className="text-sm opacity-90">Learn to play!</div>
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

      {/* Email Signup Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="text-center">
          {hasSignedUp ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiBell size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-700">We'll let you know when we launch!</span>
              </div>
              <p className="text-xs text-gray-600">
                We'll notify you when the full app launches. Thanks for your interest.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiBell size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Get notified when there's an app!</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Enter your email to be the first to know when the full app is ready.
              </p>
              <button
                onClick={() => setShowEmailSignup(true)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-4 rounded-md transition-colors duration-200"
              >
                Notify me
              </button>
            </>
          )}
        </div>
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

      {/* Email Signup Modal */}
      {showEmailSignup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <FiBell size={20} />
              <h3 className="text-lg font-semibold">Get Launch Notifications</h3>
            </div>
            <p className="text-gray-600 mb-4">
              We'll send you an email when the full app launches. No spam, just one notification when we're ready!
            </p>
            <div className="mb-4">
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isSigningUp}
              />
            </div>
            {signupMessage && (
              <div className={`mb-4 p-3 rounded-md text-sm ${
                signupMessage.includes('Thanks') || signupMessage.includes('already') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {signupMessage}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleEmailSignup}
                disabled={isSigningUp || !signupEmail.trim()}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningUp ? 'Signing up...' : 'Notify me'}
              </button>
              <button
                onClick={() => {
                  setShowEmailSignup(false);
                  setSignupEmail('');
                  setSignupMessage('');
                }}
                disabled={isSigningUp}
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
