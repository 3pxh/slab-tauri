import React from 'react';
import { FiArrowLeft, FiMonitor, FiAward, FiEyeOff, FiTrash2 } from 'react-icons/fi';
import { GiPlasticDuck } from 'react-icons/gi';
import { useGesture } from '@use-gesture/react';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, areSlabsEqual } from './Slab';
import { formatDateUTC } from '../utils';
import SlabMaker from './SlabMaker';
import GuessPanel from './GuessPanel';
import { useSlabGameState } from '../hooks/useSlabGameState';
import { analytics, sessionTracker } from '../utils/analytics';


type SlabPuzzleProps = {
  onHome: () => void;
  puzzle: Puzzle;
  slab: SlabData;
};

const SlabPuzzle: React.FC<SlabPuzzleProps> = ({ onHome, puzzle }) => {
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
    showGuessOverlay,
    remainingGuesses,
    hasWon,
    evaluationResults,
    isInGuessSession,
    flashGuessButton,
    selectedSlabForMaker,
    colorblindMode,
    showArchivedSlabs,
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
    handleCloseOverlay,
    handleGuessSubmit,
    handleColorblindModeToggle,
    handleToggleArchivedSlabs,
    reorderSlabs,
    getSlabKey,
    getCurrentColors,
    getColorblindOverlay,
    getSlabsForOverlay,
    getGroundTruth,
  } = useSlabGameState(puzzle);

  // Local state for drag and drop
  const [localDraggedIndex, setLocalDraggedIndex] = React.useState<number | null>(null);

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
          const element = document.elementFromPoint(clientX, clientY);
          if (element) {
            const dropTarget = element.closest('[data-slab-index]');
            if (dropTarget) {
              const dropIndex = parseInt(dropTarget.getAttribute('data-slab-index') || '0');
              if (dropIndex !== index) {
                reorderSlabs(index, dropIndex);
              }
            }
          }
        }
        setLocalDraggedIndex(null);
      }
    },
    onClick: ({ event, args }) => {
      const [, slab] = args as [number, SlabData];
      // Only handle click if not dragging
      if (localDraggedIndex === null) {
        event.stopPropagation();
        handleSlabClick(slab);
      }
    },
    onPointerDown: ({ event, args }) => {
      const [, slab] = args as [number, SlabData];
      // Check if the click is on the archive button and prevent gesture handling
      const target = event.target as HTMLElement;
      if (target.closest('[data-archive-button]')) {
        event.stopPropagation();
        // Don't handle archive here - let the button's onClick handle it
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
                {colorblindMode === 'icon' ? '●≈▲' : colorblindMode === 'number' ? '123' : 'ROY'}
              </span>
            )}
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
        colorblindMode={colorblindMode}
        getColorblindOverlay={getColorblindOverlay}
        puzzle={puzzle}
      />

      {/* All Slabs */}
      {allSlabs.length > 0 && (
        <div>
          <div className="bg-gray-200 p-2 rounded-lg">
            <div 
              className="flex flex-wrap gap-2 justify-center pr-4"
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
                        width: 'calc(30% - 2px)',
                        height: 'calc(30% - 2px)',
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
                        {/* Duck annotation for archived slabs */}
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

      {/* Guess Panel */}
      <GuessPanel
        isOpen={showGuessOverlay}
        onClose={handleCloseOverlay}
        remainingGuesses={remainingGuesses}
        maxGuesses={3}
        onGuessSubmit={handleGuessSubmit}
        groundTruth={getGroundTruth()}
        emptyMessage="No hidden examples available or all have been revealed."
        puzzle={puzzle}
      >
        {getSlabsForOverlay().map((slab, index) => (
          <Slab 
            key={index}
            slab={slab} 
            size="small" 
            className="w-full h-full" 
            colors={getCurrentColors()}
            colorblindMode={colorblindMode}
            getColorblindOverlay={getColorblindOverlay}
          />
        ))}
      </GuessPanel>

    </div>
  );
};

export default SlabPuzzle;
