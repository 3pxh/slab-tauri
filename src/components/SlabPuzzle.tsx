import React from 'react';
import { FiArrowLeft, FiMonitor, FiAward } from 'react-icons/fi';
import { GiPlasticDuck } from 'react-icons/gi';
import { useGesture } from '@use-gesture/react';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, areSlabsEqual, COLORS } from './Slab';
import { deepCopy, formatDateUTC } from '../utils';
import SlabMaker from './SlabMaker';
import GuessPanel, { GuessResult } from './GuessPanel';
import { executeCodeSafely } from '../utils/sandbox';
import { usePuzzleProgress } from '../hooks/usePuzzleProgress';


type SlabPuzzleProps = {
  onHome: () => void;
  puzzle: Puzzle;
  slab: SlabData;
};

const SlabPuzzle: React.FC<SlabPuzzleProps> = ({ onHome, puzzle }) => {
  const [allSlabs, setAllSlabs] = React.useState<SlabData[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [showGuessOverlay, setShowGuessOverlay] = React.useState(false);
  const [remainingGuesses, setRemainingGuesses] = React.useState(3);
  const [hasWon, setHasWon] = React.useState(false);
  const [evaluationResults, setEvaluationResults] = React.useState<Map<string, boolean>>(new Map());
  const [pendingGuessedSlabs, setPendingGuessedSlabs] = React.useState<SlabData[]>([]);
  const [isInGuessSession, setIsInGuessSession] = React.useState(false);
  const [flashGuessButton, setFlashGuessButton] = React.useState(false);
  const [selectedSlabForMaker, setSelectedSlabForMaker] = React.useState<SlabData | null>(null);
  const [isGrayscale, setIsGrayscale] = React.useState(false);
  
  // Authentication and progress tracking
  const { progress, isLoading, incrementAttempts, addTrophy, markCompleted, updateCustomData } = usePuzzleProgress(puzzle.id);

  // Track if we're in the middle of a guess submission to prevent race conditions
  const isSubmittingGuessRef = React.useRef(false);
  
  // Track if we've completed initial loading to prevent sync loops
  const hasInitializedRef = React.useRef(false);
  
  // Initialize state from puzzle and progress data - wait for both to be available
  React.useEffect(() => {
    if (hasInitializedRef.current) {
      return; // Prevent re-initialization
    }
    
    // We need at least the puzzle data to initialize
    if (!puzzle.shown_examples) {
      return;
    }
    
    // If we're still loading progress data, wait for it to complete
    // This prevents initializing with shown examples when we actually have saved progress
    if (isLoading) {
      return;
    }
    
    // If loading is complete but progress is null, that means this is a first-time user
    // We should proceed with initialization using shown examples
    
    // Start with shown examples as the base state
    let initialSlabs = puzzle.shown_examples;
    let initialRemainingGuesses = 3;
    let initialHasWon = false;
    let initialEvaluationResults = new Map<string, boolean>();
    // Only override with saved progress if we have meaningful saved data
    if (progress && progress.custom_data) {
      // Use saved slabs if available and not empty, otherwise fall back to shown examples
      if (progress.custom_data.savedSlabs && progress.custom_data.savedSlabs.length > 0) {
        initialSlabs = progress.custom_data.savedSlabs;
      }
      
      // Restore remaining guesses if available
      if (typeof progress.custom_data.remainingGuesses === 'number') {
        initialRemainingGuesses = progress.custom_data.remainingGuesses;
      }
      
      // Restore hasWon state if available
      if (typeof progress.custom_data.hasWon === 'boolean') {
        initialHasWon = progress.custom_data.hasWon;
      }
      
      // Restore evaluation results if available
      if (Array.isArray(progress.custom_data.evaluationResults)) {
        initialEvaluationResults = new Map<string, boolean>(progress.custom_data.evaluationResults);
      }
    } else if (progress) {
      // If we have progress but no custom_data, still restore basic progress info
      initialRemainingGuesses = Math.max(0, 3 - progress.attempts);
      initialHasWon = !!progress.completed_at;
    }
    
    // Set all initial state at once to prevent multiple renders
    setAllSlabs(initialSlabs);
    setRemainingGuesses(initialRemainingGuesses);
    setHasWon(initialHasWon);
    setEvaluationResults(initialEvaluationResults);
    
    // Mark as initialized
    hasInitializedRef.current = true;
  }, [puzzle.shown_examples, progress, isLoading]); // Depend on both, but hasInitializedRef prevents re-runs

  // Pre-evaluate all slabs when puzzle loads (only after initialization)
  React.useEffect(() => {
    if (!hasInitializedRef.current) return; // Wait for initialization
    
    const preEvaluateAllSlabs = async () => {
      if (!puzzle.evaluate_fn.trim()) {
        return;
      }

      // Get all slabs that need evaluation (shown examples + hidden examples)
      const allSlabsToEvaluate = [
        ...(puzzle.shown_examples || []),
        ...(puzzle.hidden_examples || [])
      ];

      // Filter out slabs that are already evaluated
      const slabsToEvaluate = allSlabsToEvaluate.filter(slab => {
        const key = getSlabKey(slab);
        return !evaluationResults.has(key);
      });

      if (slabsToEvaluate.length > 0) {
        try {
          const results = await Promise.all(
            slabsToEvaluate.map(slab => evaluateSlab(slab))
          );

          // Add new results to the map
          setEvaluationResults(prev => {
            const newMap = new Map(prev);
            slabsToEvaluate.forEach((slab, index) => {
              const key = getSlabKey(slab);
              newMap.set(key, results[index]);
            });
            return newMap;
          });
        } catch (error) {
          console.error('Error pre-evaluating slabs:', error);
        }
      }
    };

    preEvaluateAllSlabs();
  }, [puzzle.evaluate_fn, puzzle.shown_examples, puzzle.hidden_examples, evaluationResults]);


  const handleSlabCreate = (newSlab: SlabData) => {
    // If we're in a guess session, flash the guess button instead of creating a slab
    if (isInGuessSession) {
      setFlashGuessButton(true);
      setTimeout(() => setFlashGuessButton(false), 1000); // Flash for 1 second
      return;
    }
    
    // Deep clone the slab to prevent reference sharing with SlabMaker
    const clonedSlab: SlabData = deepCopy(newSlab);
    
    setAllSlabs(prev => {
      // Remove any existing slabs that are identical to the new one
      const filteredSlabs = prev.filter(existingSlab => !areSlabsEqual(clonedSlab, existingSlab));
      const newSlabs = [clonedSlab, ...filteredSlabs];
      
      // Save the updated state with the new slab
      const stateToSave = {
        savedSlabs: newSlabs,
        remainingGuesses,
        hasWon,
        evaluationResults: Array.from(evaluationResults.entries())
      };
      
      updateCustomData(puzzle.id, stateToSave).catch(error => {
        console.error('❌ Failed to save progress after slab creation:', error);
      });
      
      return newSlabs;
    });
    
    // Immediately evaluate the new slab for instant feedback
    evaluateSingleSlab(clonedSlab);
    
    // Clear the selected slab after creating
    setSelectedSlabForMaker(null);
  };

  const handleSlabClick = (clickedSlab: SlabData) => {
    // Deep clone the slab to prevent reference sharing
    const clonedSlab: SlabData = deepCopy(clickedSlab);
    
    setSelectedSlabForMaker(clonedSlab);
  };

  const handleShuffle = () => {
    setAllSlabs(prev => {
      const shuffled = [...prev];
      // Fisher-Yates shuffle algorithm
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const handleSort = () => {
    // Use cached evaluation results for sorting
    const sortedSlabs = [...allSlabs].sort((a, b) => {
      const keyA = getSlabKey(a);
      const keyB = getSlabKey(b);
      const resultA = evaluationResults.get(keyA) || false;
      const resultB = evaluationResults.get(keyB) || false;
      
      // Black (true) comes first, then white (false)
      if (resultA && !resultB) return -1;
      if (!resultA && resultB) return 1;
      return 0;
    });
    
    setAllSlabs(sortedSlabs);
  };

  // Universal gesture handler using react-use-gesture
  const bindGestures = useGesture({
    onDrag: ({ first, last, event, args }) => {
      const [index] = args as [number];
      if (first) {
        setDraggedIndex(index);
      }
      
      if (last) {
        // Find drop target
        const clientX = 'clientX' in event ? event.clientX : ('touches' in event ? event.touches?.[0]?.clientX : undefined);
        const clientY = 'clientY' in event ? event.clientY : ('touches' in event ? event.touches?.[0]?.clientY : undefined);
        
        if (clientX !== undefined && clientY !== undefined) {
          const element = document.elementFromPoint(clientX, clientY);
          if (element) {
            const dropTarget = element.closest('[data-slab-index]');
            if (dropTarget) {
              const dropIndex = parseInt(dropTarget.getAttribute('data-slab-index') || '0');
              if (dropIndex !== index) {
                setAllSlabs(prev => {
                  const newSlabs = [...prev];
                  const draggedSlab = newSlabs[index];
                  
                  // Remove the dragged item
                  newSlabs.splice(index, 1);
                  
                  // Insert at the new position
                  newSlabs.splice(dropIndex, 0, draggedSlab);
                  
                  return newSlabs;
                });
              }
            }
          }
        }
        setDraggedIndex(null);
      }
    },
    onClick: ({ event, args }) => {
      const [, slab] = args as [number, SlabData];
      // Only handle click if not dragging
      if (draggedIndex === null) {
        event.stopPropagation();
        handleSlabClick(slab);
      }
    }
  }, {
    drag: {
      filterTaps: true, // Prevent tap events when dragging
      threshold: 5, // Minimum movement to start drag
    }
  });


  const formatDate = (dateString: string): string => {
    return formatDateUTC(dateString);
  };

  // Grayscale color palette - distinct steps from light to dark
  const GRAYSCALE_COLORS = [
    '#f5f5f5', // Very light gray
    '#e0e0e0', // Light gray
    '#bdbdbd', // Medium light gray
    '#9e9e9e', // Medium gray (matches original gray)
    '#757575', // Medium dark gray
    '#616161', // Dark gray
    '#424242', // Very dark gray
  ];

  // Get the current color palette (grayscale or color)
  const getCurrentColors = (): string[] => {
    if (isGrayscale) {
      return GRAYSCALE_COLORS;
    }
    return COLORS;
  };

  const handleGrayscaleToggle = () => {
    setIsGrayscale(prev => !prev);
  };

  // Generate a unique key for a slab based on its content
  const getSlabKey = (slab: SlabData): string => {
    return JSON.stringify(slab);
  };


  const evaluateSlab = async (slab: SlabData): Promise<boolean> => {
    if (!puzzle.evaluate_fn.trim()) {
      return false;
    }

    try {
      // Execute the evaluation function in a secure sandbox
      const result = await executeCodeSafely(puzzle.evaluate_fn, slab, 5000);
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
  };

  // Function to immediately evaluate a single slab
  const evaluateSingleSlab = async (slab: SlabData) => {
    if (!puzzle.evaluate_fn.trim()) {
      return;
    }

    const key = getSlabKey(slab);
    
    // Skip if already evaluated
    if (evaluationResults.has(key)) {
      return;
    }

    try {
      const result = await evaluateSlab(slab);
      setEvaluationResults(prev => {
        const newMap = new Map(prev);
        newMap.set(key, result);
        return newMap;
      });
    } catch (error) {
      console.error('Error evaluating single slab:', error);
    }
  };

  // Function to update evaluation results for all slabs
  const updateEvaluationResults = async () => {
    if (!puzzle.evaluate_fn.trim()) {
      setEvaluationResults(new Map());
      return;
    }

    try {
      const newResults = new Map<string, boolean>();
      
      // Only evaluate slabs that don't already have results
      const slabsToEvaluate = allSlabs.filter(slab => {
        const key = getSlabKey(slab);
        return !evaluationResults.has(key);
      });

      if (slabsToEvaluate.length > 0) {
        const results = await Promise.all(
          slabsToEvaluate.map(slab => evaluateSlab(slab))
        );

        // Add new results to the map
        slabsToEvaluate.forEach((slab, index) => {
          const key = getSlabKey(slab);
          newResults.set(key, results[index]);
        });
      }

      // Merge with existing results
      setEvaluationResults(prev => {
        const merged = new Map(prev);
        newResults.forEach((value, key) => {
          merged.set(key, value);
        });
        return merged;
      });
    } catch (error) {
      console.error('Error updating evaluation results:', error);
    }
  };

  // Update evaluation results when slabs change (only after initialization)
  React.useEffect(() => {
    if (!hasInitializedRef.current) return; // Wait for initialization
    updateEvaluationResults();
  }, [allSlabs, puzzle.evaluate_fn]);

  // Get hidden examples that are not already in the current slabs list
  const getFilteredHiddenExamples = (): SlabData[] => {
    if (!puzzle.hidden_examples || puzzle.hidden_examples.length === 0) {
      return [];
    }

    const hiddenSlabs = puzzle.hidden_examples;
    
    // Filter out hidden examples that are already in allSlabs
    const filteredHidden = hiddenSlabs.filter(hiddenSlab => 
      !allSlabs.some(existingSlab => areSlabsEqual(hiddenSlab, existingSlab))
    );

    // Return the first 5 filtered hidden examples
    return filteredHidden.slice(0, 5);
  };

  // Get slabs to display in the guess overlay
  const getSlabsForOverlay = (): SlabData[] => {
    // If we have pending guessed slabs (after submission), show those
    if (pendingGuessedSlabs.length > 0) {
      return pendingGuessedSlabs;
    }
    
    // Otherwise, show filtered hidden examples
    return getFilteredHiddenExamples();
  };

  const handleGuessClick = () => {
    // Don't allow guessing if no attempts remaining
    if (remainingGuesses <= 0) {
      return;
    }
    
    setShowGuessOverlay(true);
    
    // Only start a new guess session if we're not already in one
    if (!isInGuessSession) {
      setIsInGuessSession(true);
      // Reset pending guessed slabs when starting a new guess session
      setPendingGuessedSlabs([]);
    }
  };

  const handleCloseOverlay = () => {
    setShowGuessOverlay(false);
    setIsInGuessSession(false);
    
    // Clear pending guessed slabs (they were already added in handleGuessSubmit)
    setPendingGuessedSlabs([]);
  };

  const handleGuessSubmit = async (results: GuessResult[]) => {
    const filteredHidden = getFilteredHiddenExamples();
    let allCorrect = true;
    let hasAnyGuess = false;

    results.forEach((result) => {
      if (result.index < filteredHidden.length) {
        hasAnyGuess = true;
        
        if (!result.isCorrect) {
          allCorrect = false;
        }
      }
    });

    // Only process if there are actual guesses made
    if (hasAnyGuess) {
      // Set flag to prevent race conditions during guess submission
      isSubmittingGuessRef.current = true;
      
      try {
        // Decrement remaining guesses
        setRemainingGuesses(prev => Math.max(0, prev - 1));
        
        // Store guessed slabs in pending state (will be added to main list when overlay closes)
        const guessedSlabs = results
          .filter(result => result.index < filteredHidden.length)
          .map(result => filteredHidden[result.index]);
        setPendingGuessedSlabs(guessedSlabs);
        
        // Also add the slabs immediately to ensure they're always added
        setAllSlabs(prev => [...guessedSlabs, ...prev]);
        
        // Immediately evaluate the newly added slabs
        guessedSlabs.forEach(slab => {
          evaluateSingleSlab(slab);
        });
        
        // Track progress: increment attempts
        try {
          await incrementAttempts(puzzle.id);
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
        
        // Force immediate save of the new state (do this first to avoid overwriting trophy count)
        const stateToSave = {
          savedSlabs: [...guessedSlabs, ...allSlabs],
          remainingGuesses: Math.max(0, remainingGuesses - 1),
          hasWon: allCorrect,
          evaluationResults: Array.from(evaluationResults.entries())
        };
        
        // Save immediately without debounce
        await updateCustomData(puzzle.id, stateToSave);
        
        // Check if player won (all guesses correct) - do this AFTER updateCustomData
        if (allCorrect) {
          setHasWon(true);
          
          // Track progress: mark as completed and add trophy
          try {
            await markCompleted(puzzle.id, results.filter(r => r.isCorrect).length);
            await addTrophy(puzzle.id);
          } catch (error) {
            console.error('Failed to save completion progress:', error);
          }
        }
        
      } finally {
        // Clear the flag after a short delay to allow state updates to complete
        setTimeout(() => {
          isSubmittingGuessRef.current = false;
        }, 100);
      }
    }

    setIsInGuessSession(false); // Reset guess session when guesses are submitted
  };

  // Get ground truth for the slabs in the overlay
  const getGroundTruth = (): boolean[] => {
    const slabsForOverlay = getSlabsForOverlay();
    return slabsForOverlay.map(slab => {
      const key = getSlabKey(slab);
      return evaluationResults.get(key) || false;
    });
  };



  return (
    <div className="w-full">
      {/* Puzzle Information */}
      <div className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            className="px-2 py-1 rounded text-sm hover:bg-gray-200"
            onClick={onHome}
            title="Back to levels"
            aria-label="Go back"
          >
            <FiArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {puzzle.name}
          </h2>
          {/* Progress indicators */}
          {progress && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex items-center">
                {Array.from({ length: progress.trophies }, (_, i) => (
                  <FiAward key={i} className="text-yellow-500 fill-yellow-300" size={16} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {formatDate(puzzle.publish_date)}
          </div>
          <button
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
            onClick={handleGrayscaleToggle}
            title={isGrayscale ? "Switch to color mode" : "Switch to grayscale mode"}
            aria-label={isGrayscale ? "Switch to color mode" : "Switch to grayscale mode"}
          >
            <FiMonitor 
              size={20} 
              className={isGrayscale ? "text-gray-500" : "text-blue-500"} 
            />
          </button>
        </div>
      </div>
      
      <SlabMaker 
        onCreate={handleSlabCreate} 
        onGuess={handleGuessClick}
        guessCount={remainingGuesses}
        maxGuesses={3}
        hasWon={hasWon}
        flashGuessButton={flashGuessButton}
        isInGuessSession={isInGuessSession}
        initialSlab={selectedSlabForMaker || undefined}
        onShuffle={handleShuffle}
        onSort={handleSort}
        colors={getCurrentColors()}
      />

      {/* All Slabs */}
      {allSlabs.length > 0 && (
        <div>
          <div className="bg-gray-200 p-2 rounded-lg">
            <div 
              className="flex flex-wrap gap-2 justify-center"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                console.log('Container drop event');
              }}
            >
              {allSlabs.map((slab, index) => {
                const key = getSlabKey(slab);
                const evaluationResult = evaluationResults.get(key) || false;
                const isDraggingThis = draggedIndex === index;
                
                return (
                  <div 
                    key={index} 
                    className="flex flex-col relative"
                    data-slab-index={index}
                    {...bindGestures(index, slab)}
                    style={{
                      width: 'calc(30% - 2px)',
                      height: 'calc(30% - 2px)',
                      opacity: isDraggingThis ? 0.5 : 1,
                      transform: isDraggingThis ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      cursor: 'grab',
                      touchAction: 'none'
                    }}
                  >
                    <div 
                      className="rounded-sm cursor-move relative w-full h-full hover:ring-2 hover:ring-blue-400 hover:ring-opacity-50"
                      title="Click to edit in SlabMaker"
                    >
                      <Slab slab={slab} size="small" className="w-full h-full" colors={getCurrentColors()} />
                      {/* Duck annotation directly on slab */}
                      {evaluationResult && (
                        <div 
                          className="absolute"
                          style={{
                            top: '-4px',
                            right: '-4px',
                            color: '#000000',
                            filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                          }}
                        >
                          <GiPlasticDuck size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Guess Panel */}
      <GuessPanel
        isOpen={showGuessOverlay}
        onClose={handleCloseOverlay}
        remainingGuesses={remainingGuesses}
        maxGuesses={3}
        onGuessSubmit={handleGuessSubmit}
        groundTruth={getGroundTruth()}
        emptyMessage="No hidden examples available or all have been revealed."
      >
        {getSlabsForOverlay().map((slab, index) => (
          <Slab 
            key={index}
            slab={slab} 
            size="small" 
            className="w-full h-full" 
            colors={getCurrentColors()} 
          />
        ))}
      </GuessPanel>

    </div>
  );
};

export default SlabPuzzle;
