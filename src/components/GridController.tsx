import React, { useState } from 'react';
import AnimatedGrid from './AnimatedGrid';

interface RowStructure {
  height: number;
  columns: number[];
}

const GridController: React.FC = () => {
  const [structure, setStructure] = useState<RowStructure[]>([
    { height: 1, columns: [1] }
  ]);

  const addNewCell = () => {
    setStructure(prev => {
      const newStructure = [...prev];
      const lastRow = { ...newStructure[newStructure.length - 1] };
      lastRow.columns = [...lastRow.columns, 1];
      newStructure[newStructure.length - 1] = lastRow;
      return newStructure;
    });
  };

  const extendLastCell = () => {
    setStructure(prev => {
      const newStructure = [...prev];
      const lastRow = newStructure[newStructure.length - 1];
      const lastCellIndex = lastRow.columns.length - 1;
      lastRow.columns[lastCellIndex] += 1;
      return newStructure;
    });
  };

  const addNewRow = () => {
    setStructure(prev => [...prev, { height: 1, columns: [1] }]);
  };

  const extendLastRow = () => {
    setStructure(prev => {
      const newStructure = [...prev];
      const lastRow = newStructure[newStructure.length - 1];
      lastRow.height += 1;
      return newStructure;
    });
  };

  const reset = () => {
    setStructure([{ height: 1, columns: [1] }]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 h-[calc(100vh-3rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Framer Motion Animated Grid
        </h1>
        
        <div className="flex gap-3 mb-4 flex-wrap">
          <button
            onClick={addNewCell}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            New Cell
          </button>
          
          <button
            onClick={extendLastCell}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 font-medium"
          >
            Extend Cell
          </button>
          
          <button
            onClick={addNewRow}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 font-medium"
          >
            New Row
          </button>
          
          <button
            onClick={extendLastRow}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 font-medium"
          >
            Extend Row
          </button>
          
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            Reset
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Current structure: {JSON.stringify(structure, null, 2)}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AnimatedGrid structure={structure} />
      </div>
      
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