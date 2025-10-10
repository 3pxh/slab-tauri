import React from 'react';
import { Puzzle, createPuzzle, getAllDates, getPuzzle } from '../lib/supabase';
import SlabMaker from './SlabMaker';
import Slab, { SlabData } from './Slab';
import { deepCopy, formatDateUTC } from '../utils';
import { executeCodeSafely } from '../utils/sandbox';

type SlabWithId = SlabData & { id: number };

type SlabPuzzleCreatorProps = {
  onHome: () => void;
  puzzle: Puzzle;
};

const SlabPuzzleCreator: React.FC<SlabPuzzleCreatorProps> = ({ 
  puzzle
}) => {
  const [createdSlabs, setCreatedSlabs] = React.useState<SlabWithId[]>([]);
  const [puzzleName, setPuzzleName] = React.useState(puzzle.name || '');
  const [evaluationFn, setEvaluationFn] = React.useState(puzzle.evaluate_fn || '');
  const [isCreating, setIsCreating] = React.useState(false);
  const [shownExamples, setShownExamples] = React.useState<boolean[]>([]);
  const [hiddenExamples, setHiddenExamples] = React.useState<boolean[]>([]);
  const [evaluationResults, setEvaluationResults] = React.useState<boolean[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [displayDate, setDisplayDate] = React.useState(puzzle.publish_date);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  // Function to calculate the next date after the last puzzle date
  const calculateNextDate = (dates: string[]): string => {
    if (dates.length === 0) {
      // If no dates exist, use today
      return new Date().toISOString();
    }
    
    // Find the latest date
    const latestDate = new Date(Math.max(...dates.map(date => new Date(date).getTime())));
    
    // Add one day to the latest date
    const nextDate = new Date(latestDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return nextDate.toISOString();
  };

  // Function to load the last 3 days of puzzles and their examples
  const loadLastThreeDaysPuzzles = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await getAllDates();
      console.log('All puzzle dates:', response.dates);
      
      if (response.dates.length === 0) {
        console.log('No existing puzzles found');
        return;
      }
      
      // Sort dates in descending order (most recent first)
      const sortedDates = response.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      // Get the last 3 days worth of puzzles
      const lastThreeDays = sortedDates.slice(0, 3);
      console.log('Loading puzzles for last 3 days:', lastThreeDays);
      
      const allExamples: SlabWithId[] = [];
      
      // Fetch each puzzle and extract examples
      for (const date of lastThreeDays) {
        try {
          const puzzleResponse = await getPuzzle(date);
          if (puzzleResponse.success && puzzleResponse.puzzle) {
            const puzzleData = puzzleResponse.puzzle;
            console.log(`Loading examples from puzzle: ${puzzleData.name} (${date})`);
            
            // Add shown examples
            if (puzzleData.shown_examples && puzzleData.shown_examples.length > 0) {
              puzzleData.shown_examples.forEach((example: any, index: number) => {
                const deserializedSlab = example;
                allExamples.push({
                  ...deserializedSlab,
                  id: Date.now() + Math.random() + index // Ensure unique IDs
                });
              });
            }
            
            // Add hidden examples
            if (puzzleData.hidden_examples && puzzleData.hidden_examples.length > 0) {
              puzzleData.hidden_examples.forEach((example: any, index: number) => {
                const deserializedSlab = example;
                allExamples.push({
                  ...deserializedSlab,
                  id: Date.now() + Math.random() + index + 1000 // Ensure unique IDs
                });
              });
            }
          }
        } catch (error) {
          console.error(`Failed to load puzzle for date ${date}:`, error);
        }
      }
      
      if (allExamples.length > 0) {
        setCreatedSlabs(prev => [...prev, ...allExamples]);
        setShownExamples(prev => [...prev, ...new Array(allExamples.length).fill(false)]);
        setHiddenExamples(prev => [...prev, ...new Array(allExamples.length).fill(false)]);
        setEvaluationResults(prev => [...prev, ...new Array(allExamples.length).fill(false)]);
        console.log(`Loaded ${allExamples.length} examples from last 3 days of puzzles`);
      }
      
    } catch (error) {
      console.error('Failed to load puzzle history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Set the publish date automatically when component mounts
  React.useEffect(() => {
    const setAutoDate = async () => {
      try {
        const response = await getAllDates();
        console.log('All puzzle dates:', response.dates);
        console.log('Total dates found:', response.count);
        
        const nextDate = calculateNextDate(response.dates);
        console.log('Calculated next date:', nextDate);
        
        // Update both the puzzle object and the display state
        puzzle.publish_date = nextDate;
        setDisplayDate(nextDate);
        console.log('Set puzzle publish_date to:', puzzle.publish_date);
      } catch (error) {
        console.error('Failed to fetch dates, using current date:', error);
        // Fallback to current date if fetching fails
        const fallbackDate = new Date().toISOString();
        puzzle.publish_date = fallbackDate;
        setDisplayDate(fallbackDate);
        console.log('Fallback: Set puzzle publish_date to current date:', puzzle.publish_date);
      }
    };

    setAutoDate();
  }, []);

  const handleSlabCreate = (slab: SlabData) => {
    // Deep clone the slab to prevent reference sharing
    const slabWithId: SlabWithId = { 
      ...deepCopy(slab),
      id: Date.now() + Math.random() 
    };
    
    setCreatedSlabs(prev => [...prev, slabWithId]);
    setShownExamples(prev => [...prev, false]); // Initialize shown example
    setHiddenExamples(prev => [...prev, false]); // Initialize hidden example
    setEvaluationResults(prev => [...prev, false]); // Initialize evaluation result
  };

  const handleShownExampleChange = (index: number, isShown: boolean) => {
    setShownExamples(prev => {
      const newShown = [...prev];
      newShown[index] = isShown;
      return newShown;
    });
  };

  const handleHiddenExampleChange = (index: number, isHidden: boolean) => {
    setHiddenExamples(prev => {
      const newHidden = [...prev];
      newHidden[index] = isHidden;
      return newHidden;
    });
  };

  const handleSlabClick = (index: number) => {
    // Move the clicked slab to the beginning of the list
    setCreatedSlabs(prev => {
      const newSlabs = [...prev];
      const clickedSlab = newSlabs.splice(index, 1)[0];
      return [clickedSlab, ...newSlabs];
    });

    // Reorder the corresponding state arrays
    setShownExamples(prev => {
      const newShown = [...prev];
      const clickedShown = newShown.splice(index, 1)[0];
      return [clickedShown, ...newShown];
    });

    setHiddenExamples(prev => {
      const newHidden = [...prev];
      const clickedHidden = newHidden.splice(index, 1)[0];
      return [clickedHidden, ...newHidden];
    });

    setEvaluationResults(prev => {
      const newResults = [...prev];
      const clickedResult = newResults.splice(index, 1)[0];
      return [clickedResult, ...newResults];
    });
  };

  const handleRunEvaluation = async () => {
    if (!evaluationFn.trim()) {
      alert('Please enter an evaluation function');
      return;
    }

    if (createdSlabs.length === 0) {
      alert('Please create some slabs first');
      return;
    }

    setIsRunning(true);
    try {
      // Run evaluation on each slab using secure sandbox
      const results = await Promise.all(
        createdSlabs.map(async (slab) => {
          try {
            const result = await executeCodeSafely(evaluationFn, slab, 5000);
            if (result.success) {
              return result.result;
            } else {
              console.error('Error evaluating slab:', result.error);
              return false;
            }
          } catch (error) {
            console.error('Error evaluating slab:', error);
            return false;
          }
        })
      );

      setEvaluationResults(results);
    } catch (error) {
      console.error('Error running evaluation:', error);
      alert(`Error in evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreatePuzzle = async () => {
    if (!puzzleName.trim() || !evaluationFn.trim()) {
      alert('Please fill in both puzzle name and evaluation function');
      return;
    }

    setIsCreating(true);
    try {
      // Separate slabs into shown and hidden examples
      const shownSlabs = createdSlabs.filter((_, index) => shownExamples[index]);
      const hiddenSlabs = createdSlabs.filter((_, index) => hiddenExamples[index]);

      // Slabs are now natively serializable (no conversion needed)
      const serializedShownSlabs = shownSlabs;
      const serializedHiddenSlabs = hiddenSlabs;

      const result = await createPuzzle({
        name: puzzleName.trim(),
        content_type: puzzle.content_type,
        evaluate_fn: evaluationFn.trim(),
        shown_examples: serializedShownSlabs,
        hidden_examples: serializedHiddenSlabs,
        publish_date: puzzle.publish_date
      });

      alert(`Puzzle "${result.puzzle.name}" created successfully!`);
      // Optionally navigate back to home or show success message
    } catch (error) {
      console.error('Failed to create puzzle:', error);
      alert(`Failed to create puzzle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 w-full">
      {/* Puzzle Information */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Creating Puzzle for {formatDateUTC(displayDate)}</h2>
        <div className="text-sm text-gray-600 mb-4">
          <p><strong>Content Type:</strong> {puzzle.content_type}</p>
          <p><strong>Puzzle ID:</strong> {puzzle.id}</p>
        </div>
        
        {/* Puzzle Name Field */}
        <div className="mb-4">
          <label htmlFor="puzzle-name" className="block text-sm font-medium text-gray-700 mb-1">
            Puzzle Name
          </label>
          <input
            id="puzzle-name"
            type="text"
            value={puzzleName}
            onChange={(e) => setPuzzleName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter puzzle name..."
          />
        </div>

        {/* Evaluation Function Field */}
        <div className="mb-4">
          <label htmlFor="evaluation-fn" className="block text-sm font-medium text-gray-700 mb-1">
            Evaluation Function
          </label>
          <textarea
            id="evaluation-fn"
            value={evaluationFn}
            onChange={(e) => setEvaluationFn(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter evaluation function code..."
          />
          <div className="mt-2">
            <button
              onClick={handleRunEvaluation}
              disabled={isRunning || !evaluationFn.trim() || createdSlabs.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Load History Button */}
      <div className="mb-4">
        <button
          onClick={loadLastThreeDaysPuzzles}
          disabled={isLoadingHistory}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isLoadingHistory ? 'Loading...' : 'Load Last 3 Days of Puzzles'}
        </button>
      </div>

      {/* SlabMaker for creating slabs */}
      <div className="mb-8">
        <SlabMaker onCreate={handleSlabCreate} />
      </div>
      
      {/* Created Slabs Display */}
      {createdSlabs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Created Slabs ({createdSlabs.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {createdSlabs.map((slab, index) => (
              <div key={slab.id} className="flex flex-col items-center">
                <div className="mb-2 text-sm font-medium">Slab #{index + 1}</div>
                <div 
                  onClick={() => handleSlabClick(index)}
                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  title="Click to move to front"
                >
                  <Slab slab={slab} size="small" />
                </div>
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => handleShownExampleChange(index, !shownExamples[index])}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                      shownExamples[index] 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Shown
                  </button>
                  <button
                    onClick={() => handleHiddenExampleChange(index, !hiddenExamples[index])}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                      hiddenExamples[index] 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hidden
                  </button>
                </div>
                {/* Evaluation Result Dot */}
                {evaluationResults.length > index && (
                  <div className="mt-1 flex justify-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        evaluationResults[index] 
                          ? 'bg-black' 
                          : 'bg-white border-2 border-black'
                      }`}
                      title={evaluationResults[index] ? 'True' : 'False'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example Count Summary */}
      {createdSlabs.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Example Summary</h4>
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                <span className="text-gray-600">Shown Examples: <strong>{shownExamples.filter(Boolean).length}</strong></span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                <span className="text-gray-600">Hidden Examples: <strong>{hiddenExamples.filter(Boolean).length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Puzzle Button */}
      <div className="mt-4">
        <button
          onClick={handleCreatePuzzle}
          disabled={isCreating || !puzzleName.trim() || !evaluationFn.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isCreating ? 'Creating Puzzle...' : 'Create Puzzle'}
        </button>
      </div>
    </div>
  );
};

export default SlabPuzzleCreator;
