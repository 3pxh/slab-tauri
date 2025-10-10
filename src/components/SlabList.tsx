import React from 'react';
import { useGesture } from '@use-gesture/react';
import { GiPlasticDuck } from 'react-icons/gi';
import Slab, { SlabData } from './Slab';

type SlabListProps = {
  slabs: SlabData[];
  onSlabClick: (slab: SlabData) => void;
  onSlabsReorder: (newSlabs: SlabData[]) => void;
  evaluateSlab: (slab: SlabData) => boolean;
  colors: string[];
};

const SlabList: React.FC<SlabListProps> = ({
  slabs,
  onSlabClick,
  onSlabsReorder,
  evaluateSlab,
  colors
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

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
                const newSlabs = [...slabs];
                const draggedSlab = newSlabs[index];
                
                // Remove the dragged item
                newSlabs.splice(index, 1);
                
                // Insert at the new position
                newSlabs.splice(dropIndex, 0, draggedSlab);
                
                onSlabsReorder(newSlabs);
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
        onSlabClick(slab);
      }
    }
  }, {
    drag: {
      filterTaps: true, // Prevent tap events when dragging
      threshold: 5, // Minimum movement to start drag
    }
  });

  if (slabs.length === 0) {
    return null;
  }

  return (
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
          {slabs.map((slab, index) => {
            const evaluationResult = evaluateSlab(slab);
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
                  <Slab slab={slab} size="small" className="w-full h-full" colors={colors} />
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
  );
};

export default SlabList;
