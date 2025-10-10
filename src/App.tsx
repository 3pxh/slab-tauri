import './index.css';
import React from 'react';
import SlabPuzzle from './components/SlabPuzzle';
import SlabPuzzleCreator from './components/SlabPuzzleCreator';
import LevelSelect from './components/LevelSelect';
import { getPuzzle, Puzzle } from './lib/supabase';
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
  const [mode, setMode] = React.useState<'select' | 'create' | 'solve'>('select');
  const [puzzle, setPuzzle] = React.useState<Puzzle | null>(null);
  const [currentSlab, setCurrentSlab] = React.useState<SlabData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);


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




  return (
    <div className="w-full h-full relative flex justify-center">
      <div className="w-full max-w-md mx-auto h-full">
        {mode === 'select' ? (
          <div>
            <LevelSelect onSelect={handleSelect} onCreatePuzzle={handleCreatePuzzle} />
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
              <SlabPuzzleCreator onHome={() => setMode('select')} puzzle={puzzle} />
            </div>
          </div>
        ) : mode === 'solve' && puzzle && currentSlab ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <SlabPuzzle 
                onHome={() => setMode('select')} 
                puzzle={puzzle} 
                slab={currentSlab}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
