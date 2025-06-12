import { useState, useRef, useEffect } from 'react';
import './index.css';
import AnimatedGrid from './components/AnimatedGrid';
import { parseSlab, COMMANDS } from './slab';

// const s0 = "bpbpbBbSbBbBBpbBbppbSbrBbpSrbBbBBprbBBpb";
// const s1 = "SybBtbBbBBB\
// SrbBybBtbBBpSgbBybBtbBBB\
// SrbBrbBybBBpSrbBgbBybBB\
// SgbBrbBybBBpSgbBgbBybBBB\
// SrbBrbBrbBBpSrbBrbBgbBB\
// SrbBgbBrbBBpSrbBgbBgbBB\
// SgbBrbBrbBBpSgbBrbBgbBB\
// SgbBgbBrbBBpSgbBgbBgbBBB";
const s1 = "dadsd"

function App() {
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
    const buffer = (char === COMMANDS.BEAM || char === COMMANDS.PILLAR) 
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
        structure={parseSlab("daadsdadaydd")}
        children={[
          <div key="2" className="text-2xl">RPG</div>,
          <AnimatedGrid 
            key="3"
            structure={parsedStructure}
            children={[]}
          />,
          <AnimatedGrid 
            key="3"
            structure={parseSlab("dsd")}
            children={[
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
              <AnimatedGrid 
                key="3"
                structure={parseSlab("gdadadaasdadadaasdad")}
                children={[
                  <AnimatedGrid 
                    key="cmd-q"
                    structure={parseSlab("gdadadaasdadadaa")}
                    children={[]}
                  />,
                  <div key="cmd-w" className="text-center">W<br/>slab</div>,
                  <AnimatedGrid 
                    key="cmd-e"
                    structure={parseSlab("gdadadaasdadadaa")}
                    children={[]}
                  />,
                  <div key="cmd-a" className="text-center">A<br/>pillar</div>,
                  <div key="cmd-s" className="text-center">S<br/>beam</div>,
                  <div key="cmd-d" className="text-center">D<br/>block</div>,
                  <div key="cmd-s" className="text-center">Z undo</div>,
                  <div key="cmd-d" className="text-center">X reset</div>,
                ]}
              />
            ]}
          />,
          
          // This is the same aspect ratio as the slab canvas!
          <AnimatedGrid 
            key="3"
            structure={parseSlab(s1)}
            children={[]}
          />,
          <div key="boss" className="text-2xl">management</div>,
        ]}
      />
    </div>
  );
}

export default App;
