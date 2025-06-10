import React, {useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RowStructure {
  height: number;
  columns: number[];
}

interface AnimatedGridProps {
  structure: RowStructure[];
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ structure }) => {
  const prevStructureRef = useRef(structure);
  
  // Calculate total height for percentage calculations
  const totalHeight = structure.reduce((sum, row) => sum + row.height, 0);
  
  // Determine what's new
  const getAnimationProps = (rowIndex: number, cellIndex: number) => {
    const prevStructure = prevStructureRef.current;
    const isNewRow = rowIndex >= prevStructure.length;
    const prevCellCount = prevStructure[rowIndex]?.columns.length || 0;
    const isNewCell = cellIndex >= prevCellCount;
    
    return { isNewRow, isNewCell };
  };

  // Update ref after render
  React.useEffect(() => {
    prevStructureRef.current = structure;
  });

  return (
    <div className="flex flex-col gap-2 w-full p-4 h-full bg-gray-50 rounded-lg">
      <AnimatePresence>
        {structure.map((row, rowIndex) => {
          const { isNewRow } = getAnimationProps(rowIndex, 0);
          const rowHeight = `${(row.height / totalHeight) * 100}%`;
          
          // Calculate total width for this row's columns
          const totalColumnWidth = row.columns.reduce((sum, width) => sum + width, 0);
          
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
                {row.columns.map((columnWidth, cellIndex) => {
                  const { isNewCell } = getAnimationProps(rowIndex, cellIndex);
                  const cellWidth = `${(columnWidth / totalColumnWidth) * 100}%`;
                  
                  return (
                    <motion.div
                      key={`cell-${rowIndex}-${cellIndex}`}
                      layout
                      initial={isNewCell && !isNewRow ? { flexBasis: 0, opacity: 0 } : false}
                      animate={{ flexBasis: cellWidth, opacity: 1 }}
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