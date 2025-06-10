import React, {useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedGridProps {
  structure: number[];
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ structure }) => {
  const prevStructureRef = useRef(structure);
  
  // Determine what's new
  const getAnimationProps = (rowIndex: number, cellIndex: number) => {
    const prevStructure = prevStructureRef.current;
    const isNewRow = rowIndex >= prevStructure.length;
    const prevCellCount = prevStructure[rowIndex] || 0;
    const isNewCell = cellIndex >= prevCellCount;
    
    return { isNewRow, isNewCell };
  };

  // Update ref after render
  React.useEffect(() => {
    prevStructureRef.current = structure;
  });

  const rowHeight = `${100 / structure.length}%`;

  return (
    <div className="flex flex-col gap-2 w-full p-4 h-96 bg-gray-50 rounded-lg">
      <AnimatePresence>
        {structure.map((cellCount: number, rowIndex: number) => {
          const { isNewRow } = getAnimationProps(rowIndex, 0);
          
          return (
            <motion.div
              key={`row-${rowIndex}`}
              layout
              initial={isNewRow ? { height: 0, opacity: 0 } : false}
              animate={{ height: rowHeight, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.2, 
                ease: "easeOut",
                layout: { duration: 0.2 }
              }}
              className="flex gap-2 overflow-hidden"
            >
              <AnimatePresence>
                {Array.from({ length: cellCount }).map((_, cellIndex) => {
                  const { isNewCell } = getAnimationProps(rowIndex, cellIndex);
                  
                  return (
                    <motion.div
                      key={`cell-${rowIndex}-${cellIndex}`}
                      layout
                      initial={isNewCell && !isNewRow ? { flexBasis: 0, opacity: 0 } : false}
                      animate={{ flexBasis: `${100/cellCount}%`, opacity: 1 }}
                      exit={{ flexBasis: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        ease: "easeOut",
                        layout: { duration: 0.2 }
                      }}
                      className="bg-blue-500 rounded-md h-full flex items-center justify-center text-white font-semibold hover:bg-blue-600 transition-colors"
                      style={{ minWidth: 0 }}
                    >
                      R{rowIndex + 1}C{cellIndex + 1}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedGrid; 