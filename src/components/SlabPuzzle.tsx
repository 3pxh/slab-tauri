import React from 'react';
import { FiArrowLeft, FiStar, FiMonitor } from 'react-icons/fi';
import { GiPlasticDuck } from 'react-icons/gi';
import { useGesture } from '@use-gesture/react';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, areSlabsEqual, COLORS } from './Slab';
import { deepCopy, formatDateUTC } from '../utils';
import SlabMaker from './SlabMaker';
import GuessPanel, { GuessResult } from './GuessPanel';
import { executeCodeSafely } from '../utils/sandbox';


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

  // Load shown examples into state when component mounts
  React.useEffect(() => {
    if (puzzle.shown_examples && puzzle.shown_examples.length > 0) {
      const deserializedExamples = puzzle.shown_examples;
      setAllSlabs(deserializedExamples);
    }
  }, [puzzle.shown_examples]);

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
      // Add the new slab at the beginning
      return [clonedSlab, ...filteredSlabs];
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

  // Update evaluation results when slabs change
  React.useEffect(() => {
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
    
    // Evaluate hidden examples when the overlay is opened
    evaluateHiddenExamples();
  };

  const handleCloseOverlay = () => {
    setShowGuessOverlay(false);
    setIsInGuessSession(false);
    
    // Add pending guessed slabs to the main list
    if (pendingGuessedSlabs.length > 0) {
      setAllSlabs(prev => [...pendingGuessedSlabs, ...prev]);
      
      // Immediately evaluate the newly added slabs
      pendingGuessedSlabs.forEach(slab => {
        evaluateSingleSlab(slab);
      });
      
      setPendingGuessedSlabs([]);
    }
  };

  const handleGuessSubmit = (results: GuessResult[]) => {
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
      // Decrement remaining guesses
      setRemainingGuesses(prev => Math.max(0, prev - 1));
      
      // Store guessed slabs in pending state (will be added to main list when overlay closes)
      const guessedSlabs = results
        .filter(result => result.index < filteredHidden.length)
        .map(result => filteredHidden[result.index]);
      setPendingGuessedSlabs(guessedSlabs);
      
      // Check if player won (all guesses correct)
      if (allCorrect) {
        setHasWon(true);
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

  // Evaluate hidden examples when they are shown in the guess overlay
  const evaluateHiddenExamples = async () => {
    if (!puzzle.evaluate_fn.trim()) {
      return;
    }

    const slabsForOverlay = getSlabsForOverlay();
    const slabsToEvaluate = slabsForOverlay.filter(slab => {
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
        console.error('Error evaluating hidden examples:', error);
      }
    }
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
            {hasWon && (
              <FiStar className="text-yellow-500" size={20} />
            )}
          </h2>
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
