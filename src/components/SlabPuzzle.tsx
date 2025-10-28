import React from 'react';
import { FiArrowLeft, FiMonitor, FiAward, FiEyeOff, FiTrash2, FiX } from 'react-icons/fi';
import { FiStar } from 'react-icons/fi';
import { PiShuffleBold } from 'react-icons/pi';
import { FaArrowDownUpAcrossLine } from 'react-icons/fa6';
import { useGesture } from '@use-gesture/react';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, areSlabsEqual } from './Slab';
import { formatDateUTC } from '../utils';
import SlabMaker from './SlabMaker';
import IndividualSlabGuesser from './IndividualSlabGuesser';
import { useSlabGameState } from '../hooks/useSlabGameState';
import { analytics, sessionTracker } from '../utils/analytics';
import RuleDescriptionModal from './RuleDescriptionModal';
import DifficultyIndicator from './DifficultyIndicator';
import ScrollButton from './ScrollButton';
import VictoryOverlay from './VictoryOverlay';
import { useNavigation } from '../utils/navigation';
import { getAllDates } from '../lib/supabase';


type SlabPuzzleProps = {
  onHome: () => void;
  puzzle: Puzzle;
  slab: SlabData;
};

const SlabPuzzle: React.FC<SlabPuzzleProps> = ({ onHome, puzzle }) => {
  const { goToPuzzle, goToArchive } = useNavigation();
  
  // Track puzzle start
  React.useEffect(() => {
    analytics.puzzleStarted(puzzle);
    sessionTracker.incrementPuzzleCount();
    // Set puzzle start time for analytics
    (window as any).puzzleStartTime = Date.now();
  }, [puzzle]);

  // Use the custom hook for all state management
  const {
    // State
    allSlabs,
    archivedSlabs,
    remainingGuesses,
    hasWon,
    evaluationResults,
    isInGuessSession,
    flashGuessButton,
    selectedSlabForMaker,
    colorblindMode,
    showArchivedSlabs,
    isInIndividualGuessMode,
    currentGuessIndex,
    guessCorrectCount,
    guessIncorrectCount,
    slabsToGuess,
    progress,
    
    // Actions
    handleSlabCreate,
    handleSlabClick,
    handleSlabArchive,
    handleSlabUnarchive,
    handleSlabDelete,
    handleShuffle,
    handleSort,
    handleGuessClick,
    handleIndividualGuessSubmit,
    handleProceedToNext,
    handleWinNext,
    handleColorblindModeToggle,
    handleToggleArchivedSlabs,
    reorderSlabs,
    getSlabKey,
    getCurrentColors,
    getColorblindOverlay,
  } = useSlabGameState(puzzle);

  // Show victory overlay when player wins
  React.useEffect(() => {
    if (hasWon && !isInIndividualGuessMode) {
      setShowVictoryOverlay(true);
      // Check if there's a next puzzle available
      checkNextPuzzleAvailability();
    }
  }, [hasWon, isInIndividualGuessMode]);

  const checkNextPuzzleAvailability = async () => {
    try {
      const response = await getAllDates();
      
      if (response.success && response.dates.length > 0) {
        const sortedDates = response.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        const currentDate = new Date(puzzle.publish_date);
        const currentDateStr = currentDate.toISOString().split('T')[0];
        
        // Try multiple date format comparisons
        const currentDateStrAlt = puzzle.publish_date.split('T')[0];
        
        let currentIndex = sortedDates.findIndex(date => date === currentDateStr);
        if (currentIndex === -1) {
          currentIndex = sortedDates.findIndex(date => date === currentDateStrAlt);
        }
        if (currentIndex === -1) {
          // Try comparing with the original publish_date
          currentIndex = sortedDates.findIndex(date => date === puzzle.publish_date);
        }
        
        const hasNext = currentIndex !== -1 && currentIndex < sortedDates.length - 1;
        setHasNextPuzzle(hasNext);
      } else {
        setHasNextPuzzle(false);
      }
    } catch (error) {
      console.error('Error checking next puzzle availability:', error);
      setHasNextPuzzle(false);
    }
  };

  // Scroll detection for showing/hiding the scroll-to-slabs button
  React.useEffect(() => {
    const checkScrollVisibility = () => {
      if (!slabListRef.current || !containerRef.current) return;
      const slabListRect = slabListRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isSlabListVisible = slabListRect.top < 0 || slabListRect.bottom < viewportHeight + 5;
      const shouldShow = allSlabs.length > 0 && !isSlabListVisible;
      setShowScrollToSlabs(shouldShow);
    };

    // Find the actual scrollable element
    const findScrollableElement = () => {
      let element: HTMLElement | null = containerRef.current;
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        const overflow = style.overflow + style.overflowY + style.overflowX;
        if (overflow.includes('scroll') || overflow.includes('auto')) {
          return element;
        }
        element = element.parentElement;
      }
      return window;
    };

    // Initial check
    checkScrollVisibility();

    // Set up scroll listener
    const handleScroll = () => {
      checkScrollVisibility();
    };

    const scrollableElement = findScrollableElement();
    
    // Add listeners to the actual scrollable element
    if (scrollableElement === window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Also listen to window resize
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      if (scrollableElement === window) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
    };
  }, [allSlabs.length]);

  // Local state for drag and drop
  const [localDraggedIndex, setLocalDraggedIndex] = React.useState<number | null>(null);
  
  // State for scroll-to-slab functionality
  const [showScrollToSlabs, setShowScrollToSlabs] = React.useState(false);
  const slabListRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // State for rule description modal
  const [showRuleModal, setShowRuleModal] = React.useState(false);
  
  // State for victory overlay
  const [showVictoryOverlay, setShowVictoryOverlay] = React.useState(false);
  const [hasNextPuzzle, setHasNextPuzzle] = React.useState(true);

  // Gesture handler for archived slabs (selection only, no drag)
  const bindArchivedGestures = useGesture({
    onClick: ({ event, args }) => {
      const [, slab] = args as [number, SlabData];
      // Check if the click is on action buttons
      const target = event.target as HTMLElement;
      if (target.closest('[data-unarchive-button]') || target.closest('[data-delete-button]')) {
        return; // Let the button handle the action
      }
      
      // Otherwise, select the slab
      event.stopPropagation();
      handleSlabClick(slab);
    }
  });



  // Function to calculate target index based on drop position
  const calculateTargetIndex = (clientX: number, clientY: number, draggedIndex: number): number => {
    const container = document.querySelector('[data-slab-container]') as HTMLElement;
    if (!container) return draggedIndex;

    const containerRect = container.getBoundingClientRect();
    const slabElements = container.querySelectorAll('[data-slab-index]');
    
    if (slabElements.length === 0) return 0;

    // Calculate which row the drop position is in
    const slabSize = 80; // 80px width/height as defined in the component
    const gap = 8; // 8px gap as defined by gap-2 class
    const totalSlabWidth = slabSize + gap;
    
    // Find the row index
    const relativeY = clientY - containerRect.top;
    const rowIndex = Math.floor(relativeY / (slabSize + gap));
    
    // Find the column index within the row
    const relativeX = clientX - containerRect.left;
    const colIndex = Math.floor(relativeX / totalSlabWidth);
    
    // Calculate the target index
    const slabsPerRow = Math.floor(containerRect.width / totalSlabWidth);
    const targetIndex = Math.min(rowIndex * slabsPerRow + colIndex, allSlabs.length);
    
    // If dropping on a slab, determine if we should place before or after
    const element = document.elementFromPoint(clientX, clientY);
    if (element) {
      const dropTarget = element.closest('[data-slab-index]');
      if (dropTarget) {
        const dropTargetIndex = parseInt(dropTarget.getAttribute('data-slab-index') || '0');
        const dropTargetRect = dropTarget.getBoundingClientRect();
        const dropTargetCenterX = dropTargetRect.left + dropTargetRect.width / 2;
        
        // If dropping on the left half of the target slab, place before it
        // If dropping on the right half, place after it
        if (clientX < dropTargetCenterX) {
          return dropTargetIndex;
        } else {
          return dropTargetIndex + 1;
        }
      }
    }
    
    // For empty space drops, use the calculated grid position
    // Ensure we don't drop on the same position
    if (targetIndex === draggedIndex) return draggedIndex;
    if (targetIndex === draggedIndex + 1) return draggedIndex;
    
    // Adjust for the fact that we're removing the dragged item first
    return targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
  };

  // Universal gesture handler using react-use-gesture
  const bindGestures = useGesture({
    onDrag: ({ first, last, event, args }) => {
      const [index] = args as [number];
      if (first) {
        setLocalDraggedIndex(index);
      }
      
      if (last) {
        // Find drop target
        const clientX = 'clientX' in event ? event.clientX : ('touches' in event ? event.touches?.[0]?.clientX : undefined);
        const clientY = 'clientY' in event ? event.clientY : ('touches' in event ? event.touches?.[0]?.clientY : undefined);
        
        if (clientX !== undefined && clientY !== undefined) {
          // Use the same calculation for all drops (on slabs or empty space)
          const targetIndex = calculateTargetIndex(clientX, clientY, index);
          if (targetIndex !== index && targetIndex >= 0 && targetIndex <= allSlabs.length) {
            reorderSlabs(index, targetIndex);
          }
        }
        setLocalDraggedIndex(null);
      }
    },
    onClick: ({ event, args }) => {
      const [, slab] = args as [number, SlabData];
      // Handle click regardless of drag state - the drag threshold should prevent false drags
      event.stopPropagation();
      handleSlabClick(slab);
    },
    onPointerDown: ({ event, args }) => {
      const [, slab] = args as [number, SlabData];
      // Check if the click is on the archive button and prevent gesture handling
      const target = event.target as HTMLElement;
      if (target.closest('[data-archive-button]')) {
        event.stopPropagation();
        // Don't handle archive here - let the button's onClick handle it
        return;
      }
      
      // Immediately select the slab on touch down for mobile
      // This provides instant feedback while still allowing drag functionality
      event.stopPropagation();
      handleSlabClick(slab);
    }
  }, {
    drag: {
      filterTaps: false, // Allow tap events even when drag is detected
      threshold: 15, // Increase threshold to reduce false drag detection on mobile
    }
  });


  const formatDate = (dateString: string): string => {
    return formatDateUTC(dateString);
  };

  const scrollToSlabList = () => {
    if (slabListRef.current) {
      slabListRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  const handleShowRuleModal = () => {
    setShowRuleModal(true);
  };

  const handleVictoryKeepPlaying = () => {
    setShowVictoryOverlay(false);
  };

  const handleVictoryNextPuzzle = async () => {
    setShowVictoryOverlay(false);
    
    try {
      // Get all available puzzle dates
      const response = await getAllDates();
      
      if (response.success && response.dates.length > 0) {
        // Sort dates in ascending order (oldest first)
        const sortedDates = response.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        // Find the current puzzle's date
        const currentDate = new Date(puzzle.publish_date);
        const currentDateStr = currentDate.toISOString().split('T')[0];
        
        // Try multiple date format comparisons
        const currentDateStrAlt = puzzle.publish_date.split('T')[0];
        
        let currentIndex = sortedDates.findIndex(date => date === currentDateStr);
        if (currentIndex === -1) {
          currentIndex = sortedDates.findIndex(date => date === currentDateStrAlt);
        }
        if (currentIndex === -1) {
          // Try comparing with the original publish_date
          currentIndex = sortedDates.findIndex(date => date === puzzle.publish_date);
        }
        
        if (currentIndex !== -1 && currentIndex < sortedDates.length - 1) {
          // Navigate to the next puzzle
          const nextDateStr = sortedDates[currentIndex + 1];
          const nextDate = new Date(nextDateStr);
          goToPuzzle(nextDate);
        } else {
          // No next puzzle available, go to archive
          goToArchive();
        }
      } else {
        // No puzzles available, go to archive
        goToArchive();
      }
    } catch (error) {
      console.error('Error finding next puzzle:', error);
      // Fallback to archive
      goToArchive();
    }
  };



  return (
    <div className="w-full" ref={containerRef}>
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
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {puzzle.name}
            </h2>
            {/* Difficulty indicator */}
            {puzzle.difficulty && (
              <DifficultyIndicator 
                difficulty={puzzle.difficulty} 
                size="medium"
                showTooltip={true}
              />
            )}
          </div>
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
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
            onClick={() => {
              handleColorblindModeToggle();
              analytics.colorblindModeToggled(colorblindMode);
            }}
            title={`Colorblind mode: ${colorblindMode === 'none' ? 'None' : colorblindMode === 'icon' ? 'Icons' : colorblindMode === 'number' ? 'Numbers' : 'Letters'}`}
            aria-label={`Toggle colorblind mode: ${colorblindMode}`}
          >
            <FiMonitor 
              size={20} 
              className={colorblindMode === 'none' ? "text-blue-500" : "text-orange-500"} 
            />
            {colorblindMode !== 'none' && (
              <span className="text-xs font-mono">
                {colorblindMode === 'icon' ? '●≈▲' : colorblindMode === 'number' ? '123' : 'abc'}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Show IndividualSlabGuesser when in individual guess mode, otherwise show SlabMaker */}
      {isInIndividualGuessMode ? (
        <IndividualSlabGuesser
          currentSlab={slabsToGuess[currentGuessIndex]}
          currentIndex={currentGuessIndex}
          totalSlabs={slabsToGuess.length}
          correctCount={guessCorrectCount}
          incorrectCount={guessIncorrectCount}
          onGuessSubmit={handleIndividualGuessSubmit}
          onProceedToNext={handleProceedToNext}
          onWinNext={handleWinNext}
          colors={getCurrentColors()}
          colorblindMode={colorblindMode}
          getColorblindOverlay={getColorblindOverlay}
          levelAttempts={progress?.attempts || 0}
        />
      ) : (
        <SlabMaker 
          onCreate={handleSlabCreate} 
          onGuess={handleGuessClick}
          guessCount={remainingGuesses}
          maxGuesses={3}
          hasWon={hasWon}
          flashGuessButton={flashGuessButton}
          isInGuessSession={isInGuessSession}
          initialSlab={selectedSlabForMaker || undefined}
          colors={getCurrentColors()}
          colorblindMode={colorblindMode}
          getColorblindOverlay={getColorblindOverlay}
          puzzle={puzzle}
          showRuleButton={hasWon || remainingGuesses <= 0}
          onShowRuleModal={handleShowRuleModal}
        />
      )}

      {/* Floating Scroll to Slabs Button */}
      <ScrollButton
        onClick={scrollToSlabList}
        isVisible={showScrollToSlabs}
        direction="down"
        position="right"
        title="Scroll to slab list"
        ariaLabel="Scroll to slab list"
      />

      {/* All Slabs */}
      {allSlabs.length > 0 && (
        <div ref={slabListRef}>
          <div className="bg-gray-200 p-2 rounded-lg">
            <div className="flex">
              <div 
                className="flex flex-wrap gap-2 justify-center flex-1"
                style={{ alignContent: 'flex-start' }}
                data-slab-container
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
                const isDraggingThis = localDraggedIndex === index;
                
                return (
                  <div 
                    key={index} 
                    className="flex flex-col relative"
                    data-slab-index={index}
                    {...bindGestures(index, slab)}
                    style={{
                      width: '80px',
                      height: '80px',
                      opacity: isDraggingThis ? 0.5 : 1,
                      transform: isDraggingThis ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      cursor: 'grab',
                      touchAction: 'none',
                      flexShrink: 0
                    }}
                  >
                    <div 
                      className="group rounded-sm cursor-move relative w-full h-full hover:ring-2 hover:ring-blue-400 hover:ring-opacity-50"
                      title="Click to edit in SlabMaker"
                    >
                      <Slab 
                        slab={slab} 
                        size="small" 
                        className="w-full h-full" 
                        colors={getCurrentColors()}
                        colorblindMode={colorblindMode}
                        getColorblindOverlay={getColorblindOverlay}
                      />
                      {/* Evaluation annotation directly on slab */}
                      {evaluationResult !== undefined && (
                        <div 
                          className="absolute"
                          style={{
                            top: '-8px',
                            right: '-8px',
                            color: '#000000',
                            filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                          }}
                        >
                          {evaluationResult ? (
                            <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
                          ) : (
                            <FiX size={16} className="text-red-500" />
                          )}
                        </div>
                      )}
                      {/* Archive button */}
                      <button
                        data-archive-button
                        className={`absolute top-1 left-1 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 transition-colors ${
                          selectedSlabForMaker && areSlabsEqual(selectedSlabForMaker, slab) 
                            ? 'opacity-100' 
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title="Archive this slab"
                        aria-label="Archive slab"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSlabArchive(slab);
                        }}
                      >
                        <FiEyeOff size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
              
              {/* Right gutter with shuffle and sort buttons */}
              <div className="flex flex-col gap-2 ml-2">
                <button
                  className="px-2 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 flex items-center justify-center w-8 h-8"
                  onClick={() => {
                    if (puzzle) analytics.slabsShuffled(puzzle);
                    handleShuffle();
                  }}
                  title="Randomize slab order"
                >
                  <PiShuffleBold size={14} />
                </button>
                <button
                  className="px-2 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 flex items-center justify-center w-8 h-8"
                  onClick={() => {
                    if (puzzle) analytics.slabsSorted(puzzle);
                    handleSort();
                  }}
                  title="Sort by evaluation (black first, then white)"
                >
                  <FaArrowDownUpAcrossLine size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archived Slabs Section */}
      {archivedSlabs.length > 0 && (
        <div className="mt-4">
          <button
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors w-full"
            onClick={handleToggleArchivedSlabs}
            aria-label={showArchivedSlabs ? "Hide archived slabs" : "Show archived slabs"}
          >
            <FiEyeOff size={16} />
            <span>Archived Slabs ({archivedSlabs.length})</span>
            <span className={`ml-auto transition-transform ${showArchivedSlabs ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showArchivedSlabs && (
            <div className="mt-2 bg-gray-200 p-2 rounded-lg">
              <div className="flex flex-wrap gap-2 justify-center pr-4">
                {archivedSlabs.map((slab, index) => {
                  const key = getSlabKey(slab);
                  const evaluationResult = evaluationResults.get(key) || false;
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col relative"
                      style={{
                        width: '80px',
                        height: '80px',
                      }}
                      {...bindArchivedGestures(index, slab)}
                    >
                      <div 
                        className="group rounded-sm cursor-pointer relative w-full h-full hover:ring-2 hover:ring-green-400 hover:ring-opacity-50"
                        title="Click to select"
                      >
                        <Slab 
                          slab={slab} 
                          size="small" 
                          className="w-full h-full opacity-60" 
                          colors={getCurrentColors()}
                          colorblindMode={colorblindMode}
                          getColorblindOverlay={getColorblindOverlay}
                        />
                        {/* Evaluation annotation for archived slabs */}
                        {evaluationResult !== undefined && (
                        <div 
                          className="absolute"
                          style={{
                            top: '-8px',
                            right: '-8px',
                            color: '#000000',
                            filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                          }}
                        >
                          {evaluationResult ? (
                          <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
                          ) : (
                          <FiX size={16} className="text-red-500" />
                          )}
                        </div>
                        )}
                        {/* Action buttons - only show when selected */}
                        {selectedSlabForMaker && areSlabsEqual(selectedSlabForMaker, slab) && (
                          <>
                            {/* Unarchive button */}
                            <button
                              data-unarchive-button
                              className="absolute top-1 left-1 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-green-600 transition-colors"
                              title="Unarchive this slab"
                              aria-label="Unarchive slab"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSlabUnarchive(slab);
                              }}
                            >
                              <FiEyeOff size={12} className="rotate-180" />
                            </button>
                            {/* Delete button */}
                            <button
                              data-delete-button
                              className="absolute top-1 right-1 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-red-600 transition-colors"
                              title="Delete this slab permanently"
                              aria-label="Delete slab"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSlabDelete(slab);
                              }}
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Victory Overlay */}
      <VictoryOverlay
        isOpen={showVictoryOverlay}
        onKeepPlaying={handleVictoryKeepPlaying}
        onNextPuzzle={handleVictoryNextPuzzle}
        remainingGuesses={remainingGuesses}
        puzzleName={puzzle.name}
        ruleDescription={puzzle.rule_description || ''}
        hasNextPuzzle={hasNextPuzzle}
      />

      {/* Rule Description Modal */}
      <RuleDescriptionModal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        ruleDescription={puzzle.rule_description || ''}
        puzzleName={puzzle.name}
        remainingGuesses={remainingGuesses}
      />

    </div>
  );
};

export default SlabPuzzle;
