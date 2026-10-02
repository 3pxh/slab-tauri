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

const PHASE_TITLES: Record<TutorialPhase, string> = {
  intro: 'How to play',
  puzzle: 'Your first puzzle'
};

const Tutorial: React.FC<TutorialProps> = ({ onComplete, onHome }) => {
  const [phase, setPhase] = React.useState<TutorialPhase>('intro');

  React.useEffect(() => {
    analytics.tutorialStarted();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-800">{PHASE_TITLES[phase]}</h1>
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100"
          aria-label="Skip tutorial"
        >
          <FiX size={18} />
          Skip
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
