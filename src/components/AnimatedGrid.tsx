import React, {useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slab } from '../slab';

interface AnimatedGridProps {
  structure: Slab;
  children?: React.ReactNode[];
  alwaysShowGap?: boolean;
}

// TODO: children are not passed to sub-slabs
// TODO: add border to subslab given color?

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ structure, children = [], alwaysShowGap = false }) => {
  const prevStructureRef = useRef(structure);
  const [showGap, setShowGap] = useState(false);
  
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

  // Update ref after render and handle gap timing
  useEffect(() => {
    const structureChanged = JSON.stringify(prevStructureRef.current) !== JSON.stringify(structure);
    if (structureChanged) {
      setShowGap(true);
      const timer = setTimeout(() => setShowGap(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStructureRef.current = structure;
  }, [structure]);

  let childIndex = 0;

  const renderCellContent = (cell: any, child: React.ReactNode) => {
    if (cell.slab) {
      return <AnimatedGrid structure={cell.slab} children={[]} alwaysShowGap={alwaysShowGap} />;
    }

    if (cell.diagonal) {
      return (
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-gray-300" />
          <div 
            className="absolute inset-0"
            style={{
              clipPath: cell.diagonal === 'forward' 
                ? 'polygon(100% 0, 100% 100%, 0 100%)'
                : cell.diagonal === 'backward'
                ? 'polygon(0 0, 100% 100%, 0 100%)'
                : cell.diagonal === 'forward-flip'
                ? 'polygon(0 0, 100% 0, 0 100%)'
                : 'polygon(0 0, 100% 0, 100% 100%)',
              backgroundColor: cell.color || '#3B82F6'
            }}
          />
          {child}
        </div>
      );
    }

    return child || '';
  };

  return (
    <div className={`flex flex-col w-full p-0 h-full bg-gray-300 rounded-lg ${showGap || alwaysShowGap ? 'gap-1' : ''}`}>
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
              initial={isNewRow ? { height: 0 } : false}
              animate={{ height: rowHeight, opacity: 1 }}
              exit={{ height: 0 }}
              transition={{ 
                duration: 0.2, 
                ease: "easeOut",
                layout: { duration: 0.2 }
              }}
              className={`flex overflow-hidden ${showGap || alwaysShowGap ? 'gap-1' : ''}`}
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
                      initial={isNewCell && !isNewRow ? { flexBasis: 0 } : false}
                      animate={{ flexBasis: widthPercentage, opacity: 1 }}
                      exit={{ flexBasis: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        ease: "easeOut",
                        layout: { duration: 0.2 }
                      }}
                      className="h-full flex items-center justify-center text-white font-semibold hover:opacity-90 transition-opacity"
                      style={{ 
                        minWidth: 0,
                        backgroundColor: cell.diagonal ? 'transparent' : (cell.color || '#3B82F6')
                      }}
                    >
                      {renderCellContent(cell, child)}
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