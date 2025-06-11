import { useState } from 'react';
import './index.css';
import AnimatedGrid from './components/AnimatedGrid';
import { parseSlab, Slab } from './slab';

function App() {
  const [structure, setStructure] = useState<Slab>([
    { height: 2, cells: [{ width: 1 }, { width: 1 }] },
    { height: 1, cells: [{ width: 1 }, { width: 1 }, { width: 2 }] }
  ]);
  const [text, setText] = useState('');

  const parsedStructure = parseSlab(text);

  return (
    <div className="h-screen bg-gray-300 p-1">
      <AnimatedGrid 
        structure={structure}
        children={[
          <div key="2" className="text-2xl">RPG</div>,
          <AnimatedGrid 
            key="3"
            structure={parsedStructure}
            children={[]}
          />,
          <textarea 
            key="1" 
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-full p-2 resize-none bg-transparent text-white placeholder-white/50 focus:outline-none"
            placeholder="Type slab commands (B, b, p)..."
          />,
          // This is the same aspect ratio as the slab canvas!
          <div key="slab-goal" className="text-2xl">slab</div>,
          <div key="boss" className="text-2xl">boss</div>,
        ]}
      />
    </div>
  );
}

export default App;
