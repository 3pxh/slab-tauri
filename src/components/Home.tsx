import React from 'react';
import { FiCalendar, FiPlus, FiPlay, FiMail, FiBookOpen, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import AppHeader from './AppHeader';
import { analytics } from '../utils/analytics';
import { getPuzzle, Puzzle } from '../lib/supabase';
import DifficultyIndicator from './DifficultyIndicator';
import { useNavigation } from '../utils/navigation';
import { DebugLogDisplay } from './DebugLog';
import SignInModal from './SignInModal';
import WelcomeScreen from './WelcomeScreen';
import favicon from '../assets/favicon.png';

const GEORGE_USER_ID = '3996a43b-86dd-4bda-8807-dc3d8e76e5a7';
const NEW_USER_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const WELCOME_SCREEN_SEEN_KEY = 'slab_welcome_screen_seen';
const ANONYMOUS_ACCOUNT_WARNING_DAYS = 7; // Show warning after 7 days
const ANONYMOUS_ACCOUNT_DELETION_DAYS = 30; // Accounts deleted after 10 days

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const { isAnonymous, linkAccountWithEmail, isAuthenticated, signInWithPassword, signUpWithPassword, user, isLoading } = useAuth();
  const { goToTodayPuzzle, goToArchive, goToCreate, goToTutorial, goToLogs } = useNavigation();
  
  // Check if current user is George
  const isGeorge = user?.id === GEORGE_USER_ID;
  
  // State for welcome screen
  const [showWelcomeScreen, setShowWelcomeScreen] = React.useState(false);
  const [isNavigatingToTutorial, setIsNavigatingToTutorial] = React.useState(false);
  
  // State for today's puzzle
  const [todaysPuzzle, setTodaysPuzzle] = React.useState<Puzzle | null>(null);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = React.useState(true);
  const [puzzleError, setPuzzleError] = React.useState<string | null>(null);
  
  // State for account linking
  const [showLinkAccount, setShowLinkAccount] = React.useState(false);
  
  // State for anonymous account warning modal
  const [showAnonymousWarning, setShowAnonymousWarning] = React.useState(false);
  
  // Check if user is new and should see welcome screen
  React.useEffect(() => {
    if (isLoading || !user || isNavigatingToTutorial) {
      return;
    }
    
    // Use user-specific key to track if this specific user has seen the welcome screen
    const userWelcomeKey = `${WELCOME_SCREEN_SEEN_KEY}_${user.id}`;
    const welcomeScreenSeen = localStorage.getItem(userWelcomeKey);
    if (welcomeScreenSeen === 'true') {
      return;
    }
    
    // Check if user was created recently (within threshold)
    // Supabase user objects have a created_at field
    const userCreatedAt = user.created_at ? new Date(user.created_at).getTime() : null;
    if (!userCreatedAt) {
      // If we can't determine creation time, don't show welcome screen
      return;
    }
    
    const now = Date.now();
    const timeSinceCreation = now - userCreatedAt;
    
    // Show welcome screen if user was created within the threshold
    if (timeSinceCreation < NEW_USER_THRESHOLD_MS) {
      setShowWelcomeScreen(true);
    }
  }, [user, isLoading]);
  
  // Check if anonymous user is older than 7 days and show warning
  React.useEffect(() => {
    if (isLoading || !user || !isAnonymous || showWelcomeScreen || isNavigatingToTutorial) {
      return;
    }
    
    // Check if user account is older than 7 days
    const userCreatedAt = user.created_at ? new Date(user.created_at).getTime() : null;
    if (!userCreatedAt) {
      return;
    }
    
    const now = Date.now();
    const timeSinceCreation = now - userCreatedAt;
    const daysSinceCreation = timeSinceCreation / (1000 * 60 * 60 * 24);
    
    // Show warning if account is older than 7 days
    if (daysSinceCreation >= ANONYMOUS_ACCOUNT_WARNING_DAYS) {
      setShowAnonymousWarning(true);
    }
  }, [user, isLoading, isAnonymous, showWelcomeScreen, isNavigatingToTutorial]);
  
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
  
  const handleWelcomeSkip = () => {
    if (user) {
      const userWelcomeKey = `${WELCOME_SCREEN_SEEN_KEY}_${user.id}`;
      localStorage.setItem(userWelcomeKey, 'true');
    }
    setShowWelcomeScreen(false);
  };
  
  const handleWelcomeStartTutorial = () => {
    // Mark that we're navigating to keep welcome screen visible
    setIsNavigatingToTutorial(true);
    // Save to localStorage
    if (user) {
      const userWelcomeKey = `${WELCOME_SCREEN_SEEN_KEY}_${user.id}`;
      localStorage.setItem(userWelcomeKey, 'true');
    }
    // Navigate immediately - component will unmount
    goToTutorial();
  };
  
  // Show loading screen while user is being determined
  if (isLoading || !user) {
    return (
      <div className="w-full max-w-md mx-auto h-full flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img 
            src={favicon} 
            alt="Slab! App Icon" 
            className="w-32 h-32 rounded-lg"
          />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen for new users (or while navigating to tutorial)
  if (showWelcomeScreen || isNavigatingToTutorial) {
    return (
      <WelcomeScreen
        onStartTutorial={handleWelcomeStartTutorial}
        onSkip={handleWelcomeSkip}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader titleSize="large" />

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Today's Puzzle Button */}
        <button
          onClick={() => {
            analytics.puzzleStarted({ 
              id: todaysPuzzle?.id || 'daily', 
              name: todaysPuzzle?.name || "Today's Puzzle", 
              publish_date: new Date().toISOString().split('T')[0], 
              is_daily: true 
            } as any);
            goToTodayPuzzle();
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-5 transition-colors duration-200 shadow-lg flex flex-col items-center justify-center gap-3 aspect-square"
          disabled={isLoadingPuzzle}
        >
          <FiPlay size={40} />
          <div className="text-center px-2">
            <div className="text-base font-semibold flex flex-col items-center gap-1">
              <span className="line-clamp-2">
                {isLoadingPuzzle ? 'Loading...' : (puzzleError ? 'Error loading puzzle' : (todaysPuzzle?.name || "Today's Puzzle"))}
              </span>
              {/* Difficulty indicator */}
              {todaysPuzzle?.difficulty && (
                <div className="inline-block bg-white/20 rounded px-2 py-0.5">
                  <DifficultyIndicator 
                    difficulty={todaysPuzzle.difficulty} 
                    size="small"
                    showTooltip={true}
                  />
                </div>
              )}
            </div>
            <div className="text-sm opacity-90 mt-1">
              {puzzleError ? 'Error' : 'Daily puzzle'}
            </div>
          </div>
        </button>

        {/* Archive Button */}
        <button
          onClick={() => {
            analytics.archiveViewed();
            goToArchive();
          }}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-5 transition-colors duration-200 shadow-lg flex flex-col items-center justify-center gap-3 aspect-square"
        >
          <FiCalendar size={40} />
          <div className="text-center">
            <div className="text-base font-semibold">Archive</div>
            <div className="text-sm opacity-90 mt-1">Past puzzles</div>
          </div>
        </button>

        {/* Tutorial Button */}
        <button
          onClick={() => {
            analytics.tutorialViewed();
            goToTutorial();
          }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-5 transition-colors duration-200 shadow-lg flex flex-col items-center justify-center gap-3 aspect-square"
        >
          <FiBookOpen size={40} />
          <div className="text-center">
            <div className="text-base font-semibold">Tutorial</div>
            <div className="text-sm opacity-90 mt-1">Learn to play!</div>
          </div>
        </button>

        {/* Make a Puzzle Button */}
        <button
          onClick={() => {
            analytics.puzzleCreatorViewed();
            goToCreate();
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg p-5 transition-colors duration-200 shadow-lg flex flex-col items-center justify-center gap-3 aspect-square"
        >
          <FiPlus size={40} />
          <div className="text-center">
            <div className="text-base font-semibold">Make a Puzzle</div>
            <div className="text-sm opacity-90 mt-1">Entertain a friend</div>
          </div>
        </button>
      </div>

      {/* Logs Button - only visible to George */}
      {isGeorge && (
        <div className="mt-4">
          <button
            onClick={() => {
              goToLogs();
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg p-5 transition-colors duration-200 shadow-lg"
          >
            <div className="flex items-center justify-center gap-3">
              <FiBarChart2 size={24} />
              <div className="text-left">
                <div className="text-base font-semibold">Analytics</div>
                <div className="text-sm opacity-90">View logs and stats</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Save Progress Link - only show for anonymous users */}
      {isAuthenticated && isAnonymous && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowLinkAccount(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center justify-center gap-1 mx-auto"
          >
            <FiMail size={14} />
            Save your progress / Sign In
          </button>
        </div>
      )}

      {/* Made with love */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Made with ❤️ by{' '}
        <a 
          href="https://hoqqanen.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-700 hover:text-gray-900 underline"
        >
          George Hoqqanen
        </a>
      </div>

      {/* Debug Logs */}
      <DebugLogDisplay />

      {/* Account Linking Modal */}
      <SignInModal
        isOpen={showLinkAccount}
        onClose={() => setShowLinkAccount(false)}
        linkAccountWithEmail={linkAccountWithEmail}
        signInWithPassword={signInWithPassword}
        signUpWithPassword={signUpWithPassword}
        onSuccess={() => {
          analytics.accountLinked();
        }}
      />

      {/* Anonymous Account Warning Modal */}
      {showAnonymousWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <FiMail size={20} className="text-orange-600" />
              <h3 className="text-lg font-semibold">Link Your Account to Save Progress</h3>
            </div>
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Your anonymous account is more than {ANONYMOUS_ACCOUNT_WARNING_DAYS} days old. To keep your progress safe, please link your account with an email address.
              </p>
              <p className="text-gray-700 font-medium">
                ⚠️ Anonymous accounts are automatically deleted after {ANONYMOUS_ACCOUNT_DELETION_DAYS} days.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAnonymousWarning(false);
                  setShowLinkAccount(true);
                }}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Link Account Now
              </button>
              <button
                onClick={() => {
                  setShowAnonymousWarning(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
