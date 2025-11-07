import './index.css';
import { createBrowserRouter, useLoaderData, Outlet } from 'react-router';
import Home from './components/Home';
import LevelSelect from './components/LevelSelect';
import SlabPuzzle from './components/SlabPuzzle';
import SlabPuzzleCreator from './components/SlabPuzzleCreator';
import PuzzlesList from './components/PuzzlesList';
import Tutorial from './components/Tutorial';
import Logs from './components/Logs';
import { DeepLinkHandler } from './components/DeepLinkHandler';
import { DebugLogProvider } from './components/DebugLog';
import { getPuzzle, getPuzzleByUuid, getAllDates } from './lib/supabase';
import { createSlab } from './components/Slab';
import { Puzzle } from './lib/supabase';
import { useNavigation } from './utils/navigation';

// Loader functions for routes that need data
const loadPuzzle = async ({ params }: { params: any }) => {
  const { date } = params;
  
  if (!date) {
    throw new Error('Date parameter is required');
  }

  try {
    // Handle different date formats
    let timestamp: string;
    
    if (date === 'today') {
      // Get today's date in UTC
      const today = new Date();
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      const day = today.getUTCDate();
      
      // Create timestamp for end of today (23:59:59.999) in UTC
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      timestamp = endOfDay.toISOString();
    } else {
      // Parse the date parameter
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Create timestamp for end of the selected day (23:59:59.999) in UTC
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth();
      const day = dateObj.getUTCDate();
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      timestamp = endOfDay.toISOString();
    }
    
    const response = await getPuzzle(timestamp);
    const currentSlab = createSlab();
    
    return {
      puzzle: response.puzzle,
      currentSlab
    };
  } catch (error) {
    throw new Error(`Failed to load puzzle: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const loadSharedPuzzle = async ({ params }: { params: any }) => {
  const { uuid } = params;
  
  if (!uuid) {
    throw new Error('Puzzle UUID is required');
  }

  try {
    const response = await getPuzzleByUuid(uuid);
    const currentSlab = createSlab();
    
    return {
      puzzle: response.puzzle,
      currentSlab
    };
  } catch (error) {
    throw new Error(`Failed to load shared puzzle: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const loadFirstPuzzle = async () => {
  try {
    // Get all available dates and find the first one
    const response = await getAllDates();
    if (response.success && response.dates.length > 0) {
      // The dates are already sorted in ascending order (oldest first)
      const firstDateStr = response.dates[0];
      const firstDate = new Date(firstDateStr);
      
      // Create a timestamp for the end of the first day (23:59:59.999) in UTC
      const year = firstDate.getUTCFullYear();
      const month = firstDate.getUTCMonth();
      const day = firstDate.getUTCDate();
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      const timestamp = endOfDay.toISOString();
      
      const puzzleResponse = await getPuzzle(timestamp);
      const currentSlab = createSlab();
      
      return {
        puzzle: puzzleResponse.puzzle,
        currentSlab
      };
    } else {
      throw new Error('No puzzles available');
    }
  } catch (error) {
    throw new Error(`Failed to load first puzzle: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Create a dummy puzzle for creation mode
const createDummyPuzzle = (): Puzzle => ({
  id: 'create-mode',
  content_type: 'slab_puzzle',
  name: '',
  evaluate_fn: '',
  shown_examples: [],
  hidden_examples: [],
  publish_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Route components that use loader data
const PuzzleRoute = () => {
  const { puzzle, currentSlab } = useLoaderData() as { puzzle: Puzzle; currentSlab: any };
  const { goHome } = useNavigation();
  return <SlabPuzzle puzzle={puzzle} slab={currentSlab} onHome={goHome} />;
};

const CreateRoute = () => {
  const { puzzle } = useLoaderData() as { puzzle: Puzzle };
  const { goHome, goToPuzzlesList } = useNavigation();
  return <SlabPuzzleCreator puzzle={puzzle} onHome={goHome} onViewPuzzles={goToPuzzlesList} />;
};

const TutorialRoute = () => {
  const { puzzle } = useLoaderData() as { puzzle: Puzzle; currentSlab: any };
  const { goToPuzzle, goHome } = useNavigation();
  
  const handleFirstPuzzle = () => {
    // Navigate to the first puzzle
    const firstDate = new Date(puzzle.publish_date);
    goToPuzzle(firstDate);
  };
  
  return <Tutorial onFirstPuzzle={handleFirstPuzzle} onHome={goHome} />;
};

const PuzzlesListRoute = () => {
  const { goHome } = useNavigation();
  return <PuzzlesList onHome={goHome} />;
};

// Error boundary component
const ErrorBoundary = ({ error }: { error: Error }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded-lg max-w-md">
      <div className="text-red-600 mb-2">Error</div>
      <div className="text-sm text-gray-600 mb-4">{error.message}</div>
      <button 
        onClick={() => window.location.href = '/'}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Go Home
      </button>
    </div>
  </div>
);

// Root layout component that includes deep link handler
const RootLayout = () => (
  <DebugLogProvider>
    <DeepLinkHandler />
    <Outlet />
  </DebugLogProvider>
);

// Router configuration
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
        errorElement: <ErrorBoundary error={new Error('Failed to load home page')} />
      },
      {
        path: '/archive',
        element: <LevelSelect />,
        errorElement: <ErrorBoundary error={new Error('Failed to load archive')} />
      },
      {
        path: '/puzzle/:date',
        element: <PuzzleRoute />,
        loader: loadPuzzle,
        errorElement: <ErrorBoundary error={new Error('Failed to load puzzle')} />
      },
      {
        path: '/puzzle/shared/:uuid',
        element: <PuzzleRoute />,
        loader: loadSharedPuzzle,
        errorElement: <ErrorBoundary error={new Error('Failed to load shared puzzle')} />
      },
      {
        path: '/create',
        element: <CreateRoute />,
        loader: () => ({ puzzle: createDummyPuzzle() }),
        errorElement: <ErrorBoundary error={new Error('Failed to load puzzle creator')} />
      },
      {
        path: '/puzzles',
        element: <PuzzlesListRoute />,
        errorElement: <ErrorBoundary error={new Error('Failed to load puzzles list')} />
      },
      {
        path: '/tutorial',
        element: <TutorialRoute />,
        loader: loadFirstPuzzle,
        errorElement: <ErrorBoundary error={new Error('Failed to load tutorial')} />
      },
      {
        path: '/logs',
        element: <Logs />,
        errorElement: <ErrorBoundary error={new Error('Failed to load logs')} />
      }
    ]
  }
]);

export default router;
