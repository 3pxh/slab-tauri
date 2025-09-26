import React from 'react';
import { Puzzle, createPuzzle, getAllDates } from '../lib/supabase';
import SlabMaker from './SlabMaker';
import Slab, { SlabData, serializeSlabData } from './Slab';

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
  const [evaluationResults, setEvaluationResults] = React.useState<boolean[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [displayDate, setDisplayDate] = React.useState(puzzle.publish_date);

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
    const clonedCells: SlabData['cells'] = slab.cells.map(row => row.map(cell => ({ ...cell })));
    const clonedGroups = new Map<number, { id: number; color: number }>();
    slab.groups.forEach((group, id) => {
      clonedGroups.set(id, { ...group });
    });
    
    const slabWithId = { 
      cells: clonedCells, 
      groups: clonedGroups, 
      id: Date.now() + Math.random() 
    };
    
    setCreatedSlabs(prev => [...prev, slabWithId]);
    setShownExamples(prev => [...prev, true]); // Default to shown example
    setEvaluationResults(prev => [...prev, false]); // Initialize evaluation result
  };

  const handleShownExampleChange = (index: number, isShown: boolean) => {
    setShownExamples(prev => {
      const newShown = [...prev];
      newShown[index] = isShown;
      return newShown;
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
      // Create the evaluation function
      const evalFunction = new Function('slab', evaluationFn);
      
      // Run evaluation on each slab
      const results = createdSlabs.map(slab => {
        try {
          return evalFunction(slab);
        } catch (error) {
          console.error('Error evaluating slab:', error);
          return false;
        }
      });

      setEvaluationResults(results);
    } catch (error) {
      console.error('Error creating evaluation function:', error);
      alert(`Error in evaluation function: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const hiddenSlabs = createdSlabs.filter((_, index) => !shownExamples[index]);

      // Serialize the slabs to convert Map objects to plain objects for JSON storage
      const serializedShownSlabs = shownSlabs.map(slab => serializeSlabData(slab));
      const serializedHiddenSlabs = hiddenSlabs.map(slab => serializeSlabData(slab));

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
        <h2 className="text-lg font-semibold mb-2">Creating Puzzle for {new Date(displayDate).toLocaleDateString()}</h2>
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
                <Slab slab={slab} size="small" />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id={`shown-${index}`}
                    checked={shownExamples[index] || false}
                    onChange={(e) => handleShownExampleChange(index, e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`shown-${index}`} className="text-sm text-gray-700">
                    Shown Example?
                  </label>
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

      {/* Create Puzzle Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
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
