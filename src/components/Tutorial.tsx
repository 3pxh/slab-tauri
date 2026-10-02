import React from 'react';
import { FiX } from 'react-icons/fi';
import { analytics } from '../utils/analytics';
import IntroLesson from './tutorial/IntroLesson';
import PuzzleLesson from './tutorial/PuzzleLesson';

type TutorialPhase = 'intro' | 'puzzle';

interface TutorialProps {
  onComplete: () => void;
  onHome: () => void;
}

const PHASES: TutorialPhase[] = ['intro', 'puzzle'];

const Tutorial: React.FC<TutorialProps> = ({ onComplete, onHome }) => {
  const [phase, setPhase] = React.useState<TutorialPhase>('intro');

  React.useEffect(() => {
    analytics.tutorialStarted();
  }, []);

  React.useEffect(() => {
    document.getElementById('root')?.scrollTo({ top: 0 });
  }, [phase]);

  const handleFinish = () => {
    analytics.tutorialCompleted();
    onComplete();
  };

  const handleSkip = () => {
    analytics.tutorialSkipped();
    onHome();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {PHASES.map(phaseDot => (
            <div
              key={phaseDot}
              className={`w-2.5 h-2.5 rounded-full ${phaseDot === phase ? 'bg-blue-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
          aria-label="Skip tutorial"
        >
          <FiX size={20} />
        </button>
      </div>

      {phase === 'intro' ? (
        <IntroLesson onContinue={() => setPhase('puzzle')} />
      ) : (
        <PuzzleLesson onFinish={handleFinish} />
      )}
    </div>
  );
};

export default Tutorial;
