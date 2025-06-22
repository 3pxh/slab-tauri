import { parseSlab } from '../slab';
import CanvasGrid from './CanvasGrid';
import { useState, useEffect } from 'react';

interface SlabInventoryProps {
  slabs: string[];
}

const SlabInventory = ({ slabs }: SlabInventoryProps) => {
  const [aspectRatio, setAspectRatio] = useState(.66 * window.innerWidth / window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setAspectRatio(window.innerWidth / window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
      {slabs.map((slabString, index) => {
        const structure = parseSlab(slabString);
        return (
          <div 
            key={index} 
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
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: Math.random() > 0.5 ? 'black' : 'white',
              border: '1px solid #ddd',
              margin: '3px'
            }} />
          </div>
        );
      })}
    </div>
  );
};

export default SlabInventory; 