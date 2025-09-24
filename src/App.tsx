import './index.css';
import React from 'react';
import SlabMaker from './components/SlabMaker';
import LevelSelect from './components/LevelSelect';

function App() {
  const [mode, setMode] = React.useState<'select' | 'puzzle'>('select');

  const handleSelect = (_date: Date) => {
    setMode('puzzle');
  };

  return (
    <div className="w-full h-full relative">
      {mode === 'select' ? (
        <LevelSelect onSelect={handleSelect} />
      ) : (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <SlabMaker onHome={() => setMode('select')} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
