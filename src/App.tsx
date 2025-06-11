import { useState, useRef, useEffect } from 'react';
import './index.css';
import AnimatedGrid from './components/AnimatedGrid';
import { parseSlab, Slab } from './slab';

function App() {
  const [structure, setStructure] = useState<Slab>([
    { height: 2, cells: [{ width: 1 }, { width: 1 }] },
    { height: 1, cells: [{ width: 1 }, { width: 1 }, { width: 2 }] }
  ]);
  const [text, setText] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const slideBufferRef = useRef<AudioBuffer | null>(null);
  const blockBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    // Initialize audio context and load sounds
    const initAudio = async () => {
      audioContextRef.current = new AudioContext();
      
      // Load slide.mp3
      const slideResponse = await fetch('/slide.mp3');
      const slideArrayBuffer = await slideResponse.arrayBuffer();
      slideBufferRef.current = await audioContextRef.current.decodeAudioData(slideArrayBuffer);
      
      // Load block2.mp3
      const blockResponse = await fetch('/block.mp3');
      const blockArrayBuffer = await blockResponse.arrayBuffer();
      blockBufferRef.current = await audioContextRef.current.decodeAudioData(blockArrayBuffer);
    };
    initAudio();
  }, []);

  const playSound = (char: string) => {
    if (!audioContextRef.current) return;

    // Choose buffer based on character
    const buffer = (char === 'B' || char === 'p') 
      ? slideBufferRef.current 
      : blockBufferRef.current;

    if (!buffer) return;

    // Create a new source for each play
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0);
  };

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
            onChange={e => {
              const newText = e.target.value;
              // Only play sound if text length increased
              if (newText.length > text.length) {
                const newChar = newText[newText.length - 1];
                playSound(newChar);
              }
              setText(newText);
            }}
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
