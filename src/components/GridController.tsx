import React, { useState } from 'react';
import AnimatedGrid from './AnimatedGrid';

const GridController: React.FC = () => {
  const [structure, setStructure] = useState<number[]>([1]);

  const addCellToLastRow = () => {
    setStructure(prev => {
      const newStructure = [...prev];
      newStructure[newStructure.length - 1] += 1;
      return newStructure;
    });
  };

  const addNewRow = () => {
    setStructure(prev => [...prev, 1]);
  };

  const reset = () => {
    setStructure([1]);
  };

  const removeCellFromLastRow = () => {
    setStructure(prev => {
      if (prev.length === 0) return prev;
      const newStructure = [...prev];
      const lastRowIndex = newStructure.length - 1;
      if (newStructure[lastRowIndex] > 1) {
        newStructure[lastRowIndex] -= 1;
      } else if (newStructure.length > 1) {
        newStructure.pop();
      }
      return newStructure;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Framer Motion Animated Grid
        </h1>
        
        <div className="flex gap-3 mb-4 flex-wrap">
          <button
            onClick={addCellToLastRow}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Add Cell to Last Row
          </button>
          
          <button
            onClick={addNewRow}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 font-medium"
          >
            Add New Row
          </button>
          
          <button
            onClick={removeCellFromLastRow}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 font-medium"
          >
            Remove Cell/Row
          </button>
          
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            Reset
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Current structure: [{structure.join(', ')}]
        </div>
      </div>

      <AnimatedGrid structure={structure} />
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Animation Features:</h3>
        <ul className="space-y-1">
          <li>• <strong>Layout animations</strong> - Existing cells smoothly resize when new cells are added</li>
          <li>• <strong>Entrance animations</strong> - New cells slide in from 0 width with fade</li>
          <li>• <strong>Exit animations</strong> - Removed cells/rows animate out smoothly</li>
          <li>• <strong>Coordinated timing</strong> - All animations happen in sync</li>
          <li>• <strong>Flex-basis control</strong> - Proper width distribution across cells</li>
        </ul>
      </div>
    </div>
  );
};

export default GridController; 