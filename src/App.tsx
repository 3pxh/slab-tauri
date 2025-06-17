import { useState, useRef, useEffect } from 'react';
import './index.css';
import AnimatedGrid from './components/AnimatedGrid';
import PathVisualizer from './components/PathVisualizer';
import { parseSlab, COMMANDS } from './slab';

const s1 = "dwdsd"

function ControlGrid({mode}: {mode: "FULL" | "COLOR" | "GLYPH"}) {
  switch(mode) {
    case "FULL":
      return <AnimatedGrid 
        key="ControlGrid"
        alwaysShowGap
        structure={parseSlab("gdwdwdwwsdwdwdwwsdwd")}
        children={[
          <AnimatedGrid 
            key="cmd-q"
            alwaysShowGap
            structure={parseSlab("rdwtdwydwwgsdwdwdww")}
            children={[
              <div key="cmd-r" className="text-xs text-center">r</div>,
              <div key="cmd-t" className="text-xs text-center">t</div>,
              <div key="cmd-y" className="text-xs text-center">y</div>,
              <div key="cmd-f" className="text-xs text-center">f</div>,
              <div key="cmd-g" className="text-xs text-center">g</div>,
              <div key="cmd-h" className="text-xs text-center">h</div>,
            ]}
          />,
          <div key="cmd-w" className="text-center">W<br/>slab</div>,
          <AnimatedGrid 
            key="cmd-e"
            alwaysShowGap
            structure={parseSlab("gdwdwdwwsdwdwdww")}
            children={[
              <div key="cmd-u" className="text-xs text-center">u</div>,
              <div key="cmd-i" className="text-xs text-center">i</div>,
              <div key="cmd-o" className="text-xs text-center">o</div>,
              <div key="cmd-j" className="text-xs text-center">j</div>,
              <div key="cmd-k" className="text-xs text-center">k</div>,
              <div key="cmd-l" className="text-xs text-center">l</div>,
            ]}
          />,
          <div key="cmd-a" className="text-center">A<br/>pillar</div>,
          <div key="cmd-s" className="text-center">S<br/>beam</div>,
          <div key="cmd-d" className="text-center">D<br/>block</div>,
          <div key="cmd-s" className="text-center">z undo/Z redo</div>,
          <div key="cmd-d" className="text-center">X reset</div>,
        ]}
      />
    case "COLOR":
      return <AnimatedGrid 
        key="ControlGrid"
        alwaysShowGap
        structure={parseSlab("gdwdwdwwsdwdwdww")}
        children={[
          <div key="cmd-a" className="text-center">Q<br/>red</div>,
          <div key="cmd-s" className="text-center">W<br/>teal</div>,
          <div key="cmd-d" className="text-center">E<br/>yellow</div>,
          <div key="cmd-s" className="text-center">A<br/>fuchsia</div>,
          <div key="cmd-d" className="text-center">S<br/>green</div>,
          <div key="cmd-d" className="text-center">D<br/>halftone</div>,
        ]}
      />
    case "GLYPH":
      return <AnimatedGrid 
        key="ControlGrid"
        alwaysShowGap
        structure={parseSlab("gdwdwdwwsdwdwdww")}
        children={[
          <div key="cmd-a" className="text-center">u<br/></div>,
          <div key="cmd-s" className="text-center">i<br/>self</div>,
          <div key="cmd-d" className="text-center">o<br/></div>,
          <div key="cmd-s" className="text-center">j<br/></div>,
          <div key="cmd-d" className="text-center">k<br/></div>,
          <div key="cmd-d" className="text-center">l<br/></div>,
        ]}
      />
  }
}

function App() {
  const [text, setText] = useState('');
  const [textHistory, setTextHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
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

  const handleTextChange = (newText: string) => {
    // If the last character is 'z', undo to previous state
    if (newText.endsWith('z')) {
      if (textHistory.length > 0) {
        const previousState = textHistory[textHistory.length - 2];
        setText(previousState);
        setRedoHistory(prev => [...prev, textHistory[textHistory.length - 1]]);
        setTextHistory(prev => prev.slice(0, -1));
      }
      return;
    } else if (newText.endsWith('Z')) {
      if (redoHistory.length > 0) {
        const redoState = redoHistory[redoHistory.length - 1];
        setText(redoState);
        setTextHistory(prev => [...prev, redoState]);
        setRedoHistory(prev => prev.slice(0, -1));
      }
      return;
    } else if (newText.endsWith('x')) {
      setText('');
      setTextHistory(prev => [...prev, '']);
      setRedoHistory([]);
      return;
    }
    
    setText(newText);
    setTextHistory(prev => [...prev, newText]);
    setRedoHistory([]);
  };

  const parsedStructure = parseSlab(text);

  return (
    <div className="h-screen bg-gray-300 p-1">
      <AnimatedGrid 
        structure={parseSlab("dwwdsdwdwydd")}
        alwaysShowGap
        children={[
          <PathVisualizer key="2" path={text} width={400} height={400} />,
          <AnimatedGrid 
            key="3"
            structure={parsedStructure}
            children={[]}
          />,
          <AnimatedGrid 
            key="3"
            structure={parseSlab("dsd")}
            alwaysShowGap
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
                  handleTextChange(newText);
                }}
                className="w-full h-full p-2 resize-none bg-transparent text-white placeholder-white/50 focus:outline-none"
                placeholder="Type slab commands (B, b, p)..."
              />,
              ControlGrid({
                mode: text.length > 0 
                  ? text[text.length - 1] === 'q' 
                    ? "COLOR" 
                    : text[text.length - 1] === 'e' 
                      ? "GLYPH" 
                      : "FULL"
                  : "FULL"
              })
            ]}
          />,
          
          // This is the same aspect ratio as the slab canvas!
          <AnimatedGrid 
            key="3"
            structure={parseSlab(s1)}
            alwaysShowGap
            children={[]}
          />,
          <div key="boss" className="text-2xl">management</div>,
        ]}
      />
    </div>
  );
}

export default App;
