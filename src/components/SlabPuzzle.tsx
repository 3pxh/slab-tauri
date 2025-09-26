import React from 'react';
import { FiHome } from 'react-icons/fi';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, deserializeSlabData } from './Slab';


type SlabPuzzleProps = {
  onHome: () => void;
  puzzle: Puzzle;
  slab: SlabData;
};

const SlabPuzzle: React.FC<SlabPuzzleProps> = ({ onHome, puzzle, slab }) => {

  return (
    <div className="p-4 w-full">
      {/* Puzzle Information */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Puzzle for {new Date(puzzle.publish_date).toLocaleDateString()}</h2>
        <div className="text-sm text-gray-600">
          <p><strong>Content Type:</strong> {puzzle.content_type}</p>
          <p><strong>Puzzle ID:</strong> {puzzle.id}</p>
        </div>
      </div>
      
      <div className="flex justify-start items-center gap-2 mb-4">
        <button
          className="px-4 py-2 rounded text-sm"
          onClick={onHome}
          title="Back to levels"
          aria-label="Go home"
        >
          <FiHome size={22} />
        </button>
      </div>
      
      <div className="flex justify-center">
        <Slab slab={slab} size="large" />
      </div>

      {/* Shown Examples */}
      {puzzle.shown_examples && puzzle.shown_examples.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Shown Examples</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {puzzle.shown_examples.map((example, index) => {
              // Deserialize the slab data to convert plain objects back to Map objects
              const deserializedSlab = deserializeSlabData(example);
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="mb-2 text-sm font-medium">Example #{index + 1}</div>
                  <Slab slab={deserializedSlab} size="small" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabPuzzle;
