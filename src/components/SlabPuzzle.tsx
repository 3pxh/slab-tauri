import React from 'react';
import { FiArrowLeft, FiArrowRight, FiCheck, FiChevronLeft, FiChevronRight, FiStar, FiX, FiTarget } from 'react-icons/fi';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, deserializeSlabData, areSlabsEqual } from './Slab';
import SlabMaker from './SlabMaker';


type SlabPuzzleProps = {
  onHome: () => void;
  puzzle: Puzzle;
  slab: SlabData;
};

const SlabPuzzle: React.FC<SlabPuzzleProps> = ({ onHome, puzzle }) => {
  const [allSlabs, setAllSlabs] = React.useState<SlabData[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isMouseDragging, setIsMouseDragging] = React.useState(false);
  const [mouseStartPos, setMouseStartPos] = React.useState<{x: number, y: number} | null>(null);
  const [showGuessOverlay, setShowGuessOverlay] = React.useState(false);
  const [guesses, setGuesses] = React.useState<{ [key: number]: 'white' | 'black' | null }>({});
  const [guessResults, setGuessResults] = React.useState<{ [key: number]: boolean | null }>({});
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [remainingGuesses, setRemainingGuesses] = React.useState(3);
  const [hasWon, setHasWon] = React.useState(false);
  const [pendingGuessedSlabs, setPendingGuessedSlabs] = React.useState<SlabData[]>([]);
  const [guessesSubmitted, setGuessesSubmitted] = React.useState(false);
  const [isInGuessSession, setIsInGuessSession] = React.useState(false);
  const [flashGuessButton, setFlashGuessButton] = React.useState(false);

  // Load shown examples into state when component mounts
  React.useEffect(() => {
    if (puzzle.shown_examples && puzzle.shown_examples.length > 0) {
      const deserializedExamples = puzzle.shown_examples.map(example => 
        deserializeSlabData(example)
      );
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
    const clonedCells: SlabData['cells'] = newSlab.cells.map(row => row.map(cell => ({ ...cell })));
    const clonedGroups = new Map<number, { id: number; color: number }>();
    newSlab.groups.forEach((group, id) => {
      clonedGroups.set(id, { ...group });
    });
    
    const clonedSlab: SlabData = {
      cells: clonedCells,
      groups: clonedGroups
    };
    
    setAllSlabs(prev => [clonedSlab, ...prev]);
  };

  // Mouse-based drag and drop
  const handleMouseDown = (event: React.MouseEvent, index: number) => {
    console.log('Mouse down:', index);
    setMouseStartPos({ x: event.clientX, y: event.clientY });
    setDraggedIndex(index);
  };

  // Touch support for mobile devices
  const [touchStartPos, setTouchStartPos] = React.useState<{x: number, y: number} | null>(null);
  const [touchDraggedIndex, setTouchDraggedIndex] = React.useState<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent, index: number) => {
    const touch = event.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setTouchDraggedIndex(index);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchStartPos || touchDraggedIndex === null) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Only start drag if moved more than 10px
    if (deltaX > 10 || deltaY > 10) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStartPos || touchDraggedIndex === null) {
      setTouchStartPos(null);
      setTouchDraggedIndex(null);
      return;
    }

    const touch = event.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      const dropTarget = element.closest('[data-slab-index]');
      if (dropTarget) {
        const dropIndex = parseInt(dropTarget.getAttribute('data-slab-index') || '0');
        if (dropIndex !== touchDraggedIndex) {
          setAllSlabs(prev => {
            const newSlabs = [...prev];
            const draggedSlab = newSlabs[touchDraggedIndex];
            
            // Remove the dragged item
            newSlabs.splice(touchDraggedIndex, 1);
            
            // Insert at the new position
            newSlabs.splice(dropIndex, 0, draggedSlab);
            
            return newSlabs;
          });
        }
      }
    }

    setTouchStartPos(null);
    setTouchDraggedIndex(null);
  };

  // Add global mouse event listeners for drag operations
  React.useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (mouseStartPos && draggedIndex !== null) {
        const deltaX = Math.abs(event.clientX - mouseStartPos.x);
        const deltaY = Math.abs(event.clientY - mouseStartPos.y);
        
        if (deltaX > 5 || deltaY > 5) {
          setIsMouseDragging(true);
        }
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (isMouseDragging && draggedIndex !== null) {
        // Find the element under the mouse
        const element = document.elementFromPoint(event.clientX, event.clientY);
        if (element) {
          const dropTarget = element.closest('[data-slab-index]');
          if (dropTarget) {
            const dropIndex = parseInt(dropTarget.getAttribute('data-slab-index') || '0');
            console.log('Global mouse drop:', { draggedIndex, dropIndex });
            
            if (dropIndex !== draggedIndex) {
              setAllSlabs(prev => {
                const newSlabs = [...prev];
                const draggedSlab = newSlabs[draggedIndex];
                
                // Remove the dragged item
                newSlabs.splice(draggedIndex, 1);
                
                // Insert at the new position
                newSlabs.splice(dropIndex, 0, draggedSlab);
                
                console.log('Reordered via global mouse');
                return newSlabs;
              });
            }
          }
        }
      }

      setMouseStartPos(null);
      setDraggedIndex(null);
      setIsMouseDragging(false);
    };

    if (mouseStartPos !== null) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      // Prevent body scrolling during drag
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      // Restore body scrolling
      document.body.style.overflow = '';
    };
  }, [mouseStartPos, draggedIndex, isMouseDragging]);

  // Add global touch event listeners for drag operations
  React.useEffect(() => {
    const handleGlobalTouchMove = (event: TouchEvent) => {
      if (touchStartPos && touchDraggedIndex !== null) {
        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        
        // Prevent scrolling during drag
        if (deltaX > 10 || deltaY > 10) {
          event.preventDefault();
        }
      }
    };

    const handleGlobalTouchEnd = (event: TouchEvent) => {
      if (touchStartPos && touchDraggedIndex !== null) {
        const touch = event.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element) {
          const dropTarget = element.closest('[data-slab-index]');
          if (dropTarget) {
            const dropIndex = parseInt(dropTarget.getAttribute('data-slab-index') || '0');
            if (dropIndex !== touchDraggedIndex) {
              setAllSlabs(prev => {
                const newSlabs = [...prev];
                const draggedSlab = newSlabs[touchDraggedIndex];
                
                // Remove the dragged item
                newSlabs.splice(touchDraggedIndex, 1);
                
                // Insert at the new position
                newSlabs.splice(dropIndex, 0, draggedSlab);
                
                return newSlabs;
              });
            }
          }
        }
      }

      setTouchStartPos(null);
      setTouchDraggedIndex(null);
    };

    if (touchStartPos !== null) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      // Prevent body scrolling during drag
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      // Restore body scrolling
      document.body.style.overflow = '';
    };
  }, [touchStartPos, touchDraggedIndex]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  };

  const evaluateSlab = (slab: SlabData): boolean => {
    if (!puzzle.evaluate_fn.trim()) {
      return false;
    }

    try {
      // Create the evaluation function
      const evalFunction = new Function('slab', puzzle.evaluate_fn);
      return evalFunction(slab);
    } catch (error) {
      console.error('Error evaluating slab:', error);
      return false;
    }
  };

  // Get hidden examples that are not already in the current slabs list
  const getFilteredHiddenExamples = (): SlabData[] => {
    if (!puzzle.hidden_examples || puzzle.hidden_examples.length === 0) {
      return [];
    }

    const hiddenSlabs = puzzle.hidden_examples.map(example => deserializeSlabData(example));
    
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
      // Reset all guess-related state when starting a new guess session
      setGuesses({});
      setGuessResults({});
      setShowSuccess(false);
      setPendingGuessedSlabs([]);
      setGuessesSubmitted(false);
    }
  };

  const handleCloseOverlay = () => {
    setShowGuessOverlay(false);
    // Don't reset isInGuessSession here - only reset when guesses are submitted
    setGuesses({});
    setGuessResults({});
    setShowSuccess(false);
    setGuessesSubmitted(false);
    
    // Add pending guessed slabs to the main list
    if (pendingGuessedSlabs.length > 0) {
      setAllSlabs(prev => [...pendingGuessedSlabs, ...prev]);
      setPendingGuessedSlabs([]);
    }
  };

  const handleGuessSelect = (index: number, guess: 'white' | 'black') => {
    setGuesses(prev => ({
      ...prev,
      [index]: prev[index] === guess ? null : guess
    }));
    // Clear any previous results when making a new guess
    setGuessResults(prev => ({
      ...prev,
      [index]: null
    }));
    setShowSuccess(false);
  };

  const handleSubmitGuesses = () => {
    const filteredHidden = getFilteredHiddenExamples();
    const results: { [key: number]: boolean } = {};
    let allCorrect = true;
    let hasAnyGuess = false;

    filteredHidden.forEach((slab, index) => {
      const guess = guesses[index];
      if (guess !== null) {
        hasAnyGuess = true;
        const actualResult = evaluateSlab(slab);
        const isCorrect = (guess === 'black' && actualResult) || (guess === 'white' && !actualResult);
        results[index] = isCorrect;
        if (!isCorrect) {
          allCorrect = false;
        }
      }
    });

    // Only process if there are actual guesses made
    if (hasAnyGuess) {
      // Decrement remaining guesses
      setRemainingGuesses(prev => Math.max(0, prev - 1));
      
      // Store guessed slabs in pending state (will be added to main list when overlay closes)
      const guessedSlabs = filteredHidden.filter((_, index) => guesses[index] !== null);
      setPendingGuessedSlabs(guessedSlabs);
      
      // Check if player won (all guesses correct)
      if (allCorrect) {
        setHasWon(true);
      }
    }

    setGuessResults(results);
    setShowSuccess(allCorrect);
    setGuessesSubmitted(true);
    setIsInGuessSession(false); // Reset guess session when guesses are submitted
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
        <div className="text-sm text-gray-600">
          {formatDate(puzzle.publish_date)}
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
                const evaluationResult = evaluateSlab(slab);
                const isMouseDraggingThis = isMouseDragging && draggedIndex === index;
                
                return (
                  <div 
                    key={index} 
                    className="flex flex-col relative"
                    data-slab-index={index}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                    style={{
                      width: 'calc(30% - 2px)',
                      height: 'calc(30% - 2px)',
                      opacity: touchDraggedIndex === index || isMouseDraggingThis ? 0.5 : 1,
                      transform: touchDraggedIndex === index || isMouseDraggingThis ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      cursor: 'grab'
                    }}
                  >
                    <div className="rounded-sm cursor-move relative w-full h-full">
                      <Slab slab={slab} size="small" className="w-full h-full" />
                      {/* Evaluation indicator circle */}
                      <div 
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: evaluationResult ? '#000000' : '#ffffff',
                          bottom: '-2px',
                          right: '-2px',
                          boxShadow: '1px 1px 2px rgba(0,0,0,0.25)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Guess Overlay */}
      {showGuessOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FiTarget size={20} />
                <span className="text-lg font-semibold">{remainingGuesses}/3</span>
              </div>
              <button
                className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                onClick={handleCloseOverlay}
                title="Close"
              >
                <FiX size={16} />
              </button>
            </div>
            
            {showSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                🎉 Congratulations! All your guesses are correct!
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getSlabsForOverlay().map((slab, index) => {
                const currentGuess = guesses[index];
                const result = guessResults[index];
                const isIncorrect = result === false;
                const hasBeenSubmitted = result !== null && result !== undefined;
                
                return (
                  <div 
                    key={index} 
                    className={`relative flex flex-col items-center p-4 rounded-lg border-2 ${
                      hasBeenSubmitted && isIncorrect ? 'border-red-500 bg-red-50' : 
                      hasBeenSubmitted && !isIncorrect ? 'border-green-500 bg-green-50' :
                      currentGuess ? 'border-blue-300 bg-blue-50' : 
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {/* White Guess Button (Left) */}
                      <button
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          currentGuess === 'white' 
                            ? 'bg-white border-gray-400' 
                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                        onClick={() => handleGuessSelect(index, 'white')}
                        title="Guess: White (False)"
                      >
                        <FiChevronLeft 
                          size={16} 
                          className={currentGuess === 'white' ? 'text-gray-800' : 'text-gray-600'} 
                        />
                      </button>
                      
                      {/* Slab */}
                      <div className="w-32 h-32">
                        <Slab slab={slab} size="small" className="w-full h-full" />
                      </div>
                      
                      {/* Black Guess Button (Right) */}
                      <button
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          currentGuess === 'black' 
                            ? 'bg-black border-gray-400' 
                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                        onClick={() => handleGuessSelect(index, 'black')}
                        title="Guess: Black (True)"
                      >
                        <FiChevronRight 
                          size={16} 
                          className={currentGuess === 'black' ? 'text-white' : 'text-gray-600'} 
                        />
                      </button>
                    </div>
                    
                      {/* Evaluation result dot - only show after submission */}
                      {hasBeenSubmitted && (
                        <div 
                          className="absolute w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: evaluateSlab(slab) ? '#000000' : '#ffffff',
                            bottom: '8px',
                            right: '8px',
                            boxShadow: '1px 1px 2px rgba(0,0,0,0.25)'
                          }}
                        />
                      )}
                  </div>
                );
              })}
            </div>
            
            {getSlabsForOverlay().length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No hidden examples available or all have been revealed.
              </div>
            )}
            
            {/* Submit/Close Button */}
            {getSlabsForOverlay().length > 0 && (
              <div className="mt-6 flex justify-center">
                {guessesSubmitted ? (
                  <button
                    className="px-6 py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 flex items-center gap-2"
                    onClick={handleCloseOverlay}
                    title="Close"
                  >
                    <FiArrowRight size={20} />
                  </button>
                ) : (
                  <button
                    className="px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2"
                    onClick={handleSubmitGuesses}
                    title="Submit your guesses"
                  >
                    <FiCheck size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabPuzzle;
