import './index.css';
import React from 'react';
import SlabPuzzle from './components/SlabPuzzle';
import SlabPuzzleCreator from './components/SlabPuzzleCreator';
import LevelSelect from './components/LevelSelect';
import Home from './components/Home';
import PuzzlesList from './components/PuzzlesList';
import { getPuzzle, getPuzzleByUuid, Puzzle } from './lib/supabase';
import { SlabData, createSlab } from './components/Slab';

// Automatically run sandbox tests in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/runSandboxTests').then(({ runSandboxTests }) => {
    // Make test functions available globally for manual testing
    (globalThis as any).runSandboxTests = runSandboxTests;
    
    // Auto-run tests and report results
    runSandboxTests().then(() => {
      console.log('✅ Sandbox security tests passed - your app is secure!');
    }).catch((error) => {
      console.error('❌ Sandbox security tests failed:', error);
    });
  });
}

function App() {
  const [mode, setMode] = React.useState<'home' | 'select' | 'create' | 'solve' | 'puzzles' | 'shared'>('home');
  const [puzzle, setPuzzle] = React.useState<Puzzle | null>(null);
  const [currentSlab, setCurrentSlab] = React.useState<SlabData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Handle URL hash changes for shared puzzles
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const puzzleMatch = hash.match(/#\/puzzle\/([a-f0-9-]+)/);
      
      if (puzzleMatch) {
        const puzzleUuid = puzzleMatch[1];
        loadSharedPuzzle(puzzleUuid);
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const loadSharedPuzzle = async (uuid: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getPuzzleByUuid(uuid);
      setPuzzle(response.puzzle);
      setCurrentSlab(createSlab());
      setMode('shared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared puzzle');
      console.error('Error loading shared puzzle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (date: Date) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create a timestamp for the end of the selected day using UTC to ensure consistency
      // This matches the UTC-based date comparison used in the calendar
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      
      // Create timestamp for end of the selected day (23:59:59.999) in UTC
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      const timestamp = endOfDay.toISOString();
      
      const response = await getPuzzle(timestamp);
      setPuzzle(response.puzzle);
      // Create a default slab for the puzzle
      setCurrentSlab(createSlab());
      setMode('solve'); // Go directly to solve mode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      console.error('Error loading puzzle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePuzzle = () => {
    // Create a dummy puzzle for creation mode
    const dummyPuzzle: Puzzle = {
      id: 'create-mode',
      content_type: 'slab_puzzle',
      name: 'Dummy Puzzle',
      evaluate_fn: '',
      shown_examples: [],
      hidden_examples: [],
      publish_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setPuzzle(dummyPuzzle);
    setMode('create');
  };

  const handleTodayPuzzle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get today's date in UTC
      const today = new Date();
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      const day = today.getUTCDate();
      
      // Create timestamp for end of today (23:59:59.999) in UTC
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      const timestamp = endOfDay.toISOString();
      
      const response = await getPuzzle(timestamp);
      setPuzzle(response.puzzle);
      // Create a default slab for the puzzle
      setCurrentSlab(createSlab());
      setMode('solve'); // Go directly to solve mode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load today\'s puzzle');
      console.error('Error loading today\'s puzzle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = () => {
    setMode('select');
  };

  const handleViewPuzzles = () => {
    setMode('puzzles');
  };




  return (
    <div className="w-full h-full relative flex justify-center">
      <div className="w-full max-w-md mx-auto h-full">
        {mode === 'home' ? (
          <Home 
            onTodayPuzzle={handleTodayPuzzle}
            onArchive={handleArchive}
            onCreatePuzzle={handleCreatePuzzle}
          />
        ) : mode === 'select' ? (
          <div>
            <LevelSelect onSelect={handleSelect} />
            {loading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-center">Loading puzzle...</div>
                </div>
              </div>
            )}
            {error && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-4 rounded-lg max-w-md">
                  <div className="text-red-600 mb-2">Error loading puzzle</div>
                  <div className="text-sm text-gray-600 mb-4">{error}</div>
                  <button 
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : mode === 'create' && puzzle ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <SlabPuzzleCreator 
                onHome={() => setMode('home')} 
                onViewPuzzles={handleViewPuzzles}
                puzzle={puzzle} 
              />
            </div>
          </div>
        ) : mode === 'solve' && puzzle && currentSlab ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <SlabPuzzle 
                onHome={() => setMode('home')} 
                puzzle={puzzle} 
                slab={currentSlab}
              />
            </div>
          </div>
        ) : mode === 'puzzles' ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <PuzzlesList onHome={() => setMode('home')} />
            </div>
          </div>
        ) : mode === 'shared' && puzzle && currentSlab ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <SlabPuzzle 
                onHome={() => setMode('home')} 
                puzzle={puzzle} 
                slab={currentSlab}
              />
            </div>
          </div>
        ) : null}
        
        {/* Global loading and error overlays */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-center">Loading puzzle...</div>
            </div>
          </div>
        )}
        {error && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg max-w-md">
              <div className="text-red-600 mb-2">Error loading puzzle</div>
              <div className="text-sm text-gray-600 mb-4">{error}</div>
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
