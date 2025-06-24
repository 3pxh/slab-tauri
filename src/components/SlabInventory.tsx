import { parseSlab, Slab } from '../slab';
import CanvasGrid from './CanvasGrid';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

interface SlabInventoryProps {
  slabs: string[];
  test: (slab: Slab) => boolean;
  isCode?: boolean;
}

const SlabInventory = ({ slabs, test, isCode = false }: SlabInventoryProps) => {
  const [aspectRatio, setAspectRatio] = useState(.66 * window.innerWidth / window.innerHeight);
  const [selections, setSelections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleResize = () => {
      setAspectRatio(window.innerWidth / window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSelection = (slabString: string, selectedValue: boolean) => {
    setSelections(prev => ({
      ...prev,
      [slabString]: selectedValue
    }));
  };

  const allSlabsSelected = slabs.every(slab => selections.hasOwnProperty(slab));
  const allSelectionsCorrect = allSlabsSelected && slabs.every(slab => {
    const structure = parseSlab(slab);
    const testResult = test(structure);
    return selections[slab] === testResult;
  });

  return (
    <LayoutGroup>
      <motion.div layout style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
        {allSelectionsCorrect && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#10B981',
              marginBottom: '10px'
            }}
          >
            Code Cracked! 🎉
          </motion.div>
        )}
        <AnimatePresence>
          {slabs.map((slabString) => {
            const structure = parseSlab(slabString);
            const testResult = test(structure);
            const isSelected = selections[slabString];
            
            return (
              <motion.div 
                layout
                key={slabString} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ 
                  flex: '0 0 calc(20% - 10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: `${aspectRatio}`,
                  border: '1px solid #eee',
                  boxSizing: 'border-box'
                }}>
                  <CanvasGrid structure={structure} duration={0} />
                </div>
                {!isCode ? (
                  // Single dot showing test result
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: testResult ? 'black' : 'white',
                    border: '1px solid #ddd',
                    margin: '3px'
                  }} />
                ) : (
                  // Two dots for selection
                  <div style={{ display: 'flex', gap: '5px', margin: '3px' }}>
                    <div 
                      onClick={() => handleSelection(slabString, false)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        border: `2px solid ${isSelected === false ? '#3B82F6' : '#ddd'}`,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }} 
                    />
                    <div 
                      onClick={() => handleSelection(slabString, true)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'black',
                        border: `2px solid ${isSelected === true ? '#3B82F6' : '#ddd'}`,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }} 
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
};

export default SlabInventory; 