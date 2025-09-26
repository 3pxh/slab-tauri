import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, deserializeSlabData } from './Slab';
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
    setAllSlabs(prev => [newSlab, ...prev]);
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
          <h2 className="text-lg font-semibold">{puzzle.name}</h2>
        </div>
        <div className="text-sm text-gray-600">
          {formatDate(puzzle.publish_date)}
        </div>
      </div>
      
      <SlabMaker onCreate={handleSlabCreate} />

      {/* All Slabs */}
      {allSlabs.length > 0 && (
        <div>
          <div className="bg-gray-200 p-2 rounded-lg">
            <div 
              className="grid grid-cols-3 gap-4"
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
                    className="flex flex-col items-center relative"
                    data-slab-index={index}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                    style={{
                      opacity: touchDraggedIndex === index || isMouseDraggingThis ? 0.5 : 1,
                      transform: touchDraggedIndex === index || isMouseDraggingThis ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      cursor: 'grab'
                    }}
                  >
                    <div className="rounded-sm cursor-move relative">
                      <Slab slab={slab} size="small" />
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
    </div>
  );
};

export default SlabPuzzle;
