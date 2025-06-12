import React, {useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slab } from '../slab';

interface AnimatedGridProps {
  structure: Slab;
  children?: React.ReactNode[];
}

// TODO: children are not passed to sub-slabs
// TODO: add border to subslab given color?

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ structure, children = [] }) => {
  const prevStructureRef = useRef(structure);
  
  // Calculate total height for percentage calculations
  const totalHeight = structure.reduce((sum, row) => sum + row.height, 0);
  
  // Determine what's new
  const getAnimationProps = (rowIndex: number, cellIndex: number) => {
    const prevStructure = prevStructureRef.current;
    const isNewRow = rowIndex >= prevStructure.length;
    const prevCellCount = prevStructure[rowIndex]?.cells.length || 0;
    const isNewCell = cellIndex >= prevCellCount;
    
    return { isNewRow, isNewCell };
  };

  // Update ref after render
  React.useEffect(() => {
    prevStructureRef.current = structure;
  });

  let childIndex = 0;

  return (
    <div className="flex flex-col gap-1 w-full p-0 h-full bg-gray-300 rounded-lg">
      <AnimatePresence>
        {structure.map((row, rowIndex) => {
          const { isNewRow } = getAnimationProps(rowIndex, 0);
          const rowHeight = `${(row.height / totalHeight) * 100}%`;
          
          // Calculate total width for this row's cells
          const totalCellWidth = row.cells.reduce((sum: number, cell) => sum + cell.width, 0);
          
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
              className="flex overflow-hidden gap-1"
            >
              <AnimatePresence>
                {row.cells.map((cell, cellIndex) => {
                  const { isNewCell } = getAnimationProps(rowIndex, cellIndex);
                  const widthPercentage = `${(cell.width / totalCellWidth) * 100}%`;
                  const child = children[childIndex++];
                  
                  return (
                    <motion.div
                      key={`cell-${rowIndex}-${cellIndex}`}
                      layout
                      initial={isNewCell && !isNewRow ? { flexBasis: 0, opacity: 0 } : false}
                      animate={{ flexBasis: widthPercentage, opacity: 1 }}
                      exit={{ flexBasis: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        ease: "easeOut",
                        layout: { duration: 0.2 }
                      }}
                      className="rounded-md h-full flex items-center justify-center text-white font-semibold hover:opacity-90 transition-opacity"
                      style={{ 
                        minWidth: 0,
                        backgroundColor: cell.color || '#3B82F6' // Default to blue if no color
                      }}
                    >
                      {cell.slab ? (
                        <AnimatedGrid 
                          structure={cell.slab}
                          children={[]}
                        />
                      ) : (
                        child || ''//`R${rowIndex + 1}C${cellIndex + 1}`
                      )}
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