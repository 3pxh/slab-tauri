import React from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import Slab, { SlabData } from '../Slab';
import NextArrowButton from './NextArrowButton';
import { ComparisonIcon, EmptyIconSlot, GuessIcon, TruthIcon } from './GuessIcons';
import '../../slabAnimations.css';

type GuessPhase = 'choosing' | 'guessed' | 'truthShown' | 'compared';

const NEXT_PHASE: Partial<Record<GuessPhase, GuessPhase>> = {
  guessed: 'truthShown',
  truthShown: 'compared'
};

const AUTOMATIC_STEP_DELAY_MS = 800;

const getTruthIsStar = (guessedStar: boolean | null, isCorrect: boolean | null): boolean | null => {
  if (guessedStar === null || isCorrect === null) return null;
  return isCorrect ? guessedStar : !guessedStar;
};

type GuessRoundProps = {
  slab: SlabData;
  colors: string[];
  isGuided: boolean;
  onGuessSubmit: (isStar: boolean) => Promise<boolean>;
  onProceed: () => void;
};

const GuessRound: React.FC<GuessRoundProps> = ({
  slab,
  colors,
  isGuided,
  onGuessSubmit,
  onProceed
}) => {
  const [phase, setPhase] = React.useState<GuessPhase>('choosing');
  const [guessedStar, setGuessedStar] = React.useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const nextPhase = NEXT_PHASE[phase];
    if (isGuided || !nextPhase) return;

    const timer = setTimeout(() => setPhase(nextPhase), AUTOMATIC_STEP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, isGuided]);

  const handlePick = async (pickedStar: boolean) => {
    if (phase !== 'choosing') return;

    setGuessedStar(pickedStar);
    setIsCorrect(await onGuessSubmit(pickedStar));
    setPhase('guessed');
  };

  const handleNext = () => {
    const nextPhase = NEXT_PHASE[phase];
    if (nextPhase) setPhase(nextPhase);
    else onProceed();
  };

  const hasGuessed = phase !== 'choosing';
  const isTruthShown = phase === 'truthShown' || phase === 'compared';
  const isCompared = phase === 'compared';
  const truthIsStar = getTruthIsStar(guessedStar, isCorrect);
  const showNextArrow = isGuided ? hasGuessed : isCompared;

  const getSlabAnimationClass = (): string => {
    if (!isCompared) return '';
    return isCorrect ? 'slab-sparkle' : 'slab-shake';
  };

  return (
    <div className="p-4 w-full max-w-md mx-auto flex flex-col items-center gap-4">
      <div className={`w-48 h-48 ${getSlabAnimationClass()}`}>
        <Slab slab={slab} size="medium" className="w-full h-full" colors={colors} />
      </div>

      <div className="flex items-center justify-center gap-3 h-16">
        {hasGuessed && guessedStar !== null ? (
          <div className="guess-rise-in">
            <GuessIcon isStar={guessedStar} />
          </div>
        ) : (
          <EmptyIconSlot />
        )}
        <div className="w-10 h-10 flex items-center justify-center">
          {isCompared && isCorrect !== null && <ComparisonIcon isMatch={isCorrect} />}
        </div>
        {isTruthShown && truthIsStar !== null ? (
          <div className="pop-in">
            <TruthIcon isStar={truthIsStar} />
          </div>
        ) : (
          <EmptyIconSlot />
        )}
      </div>

      <div className="h-16 flex items-center justify-center gap-4">
        {phase === 'choosing' ? (
          <>
            <button
              className={`w-16 h-16 rounded-full flex items-center justify-center bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:scale-105 transition-all ${
                isGuided ? 'coach-pulse-ring' : ''
              }`}
              onClick={() => handlePick(false)}
              aria-label="Guess: not a star"
            >
              <FiX size={24} className="text-red-600" />
            </button>
            <button
              className={`w-16 h-16 rounded-full flex items-center justify-center bg-yellow-100 border-2 border-yellow-300 hover:bg-yellow-200 hover:scale-105 transition-all ${
                isGuided ? 'coach-pulse-ring' : ''
              }`}
              onClick={() => handlePick(true)}
              aria-label="Guess: a star"
            >
              <FiStar size={24} className="text-yellow-600" />
            </button>
          </>
        ) : (
          showNextArrow && <NextArrowButton onClick={handleNext} />
        )}
      </div>
    </div>
  );
};

type TutorialSlabGuesserProps = {
  currentSlab: SlabData;
  currentIndex: number;
  totalSlabs: number;
  correctCount: number;
  colors: string[];
  guidedSlabCount: number;
  onGuessSubmit: (isStar: boolean) => Promise<boolean>;
  onProceedToNext: () => Promise<void>;
  onWinNext: () => Promise<void>;
};

const TutorialSlabGuesser: React.FC<TutorialSlabGuesserProps> = ({
  currentSlab,
  currentIndex,
  totalSlabs,
  correctCount,
  colors,
  guidedSlabCount,
  onGuessSubmit,
  onProceedToNext,
  onWinNext
}) => {
  if (currentIndex >= totalSlabs) {
    const isPerfect = correctCount === totalSlabs;

    return (
      <div className="p-4 w-full max-w-md mx-auto flex flex-col items-center gap-6">
        <div
          className={`w-48 h-48 flex items-center justify-center rounded-lg shadow-lg ${
            isPerfect ? 'bg-yellow-500' : 'bg-gray-500'
          }`}
        >
          <div className="text-5xl font-bold text-white">
            {correctCount}/{totalSlabs}
          </div>
        </div>
        <NextArrowButton onClick={onWinNext} />
      </div>
    );
  }

  return (
    <GuessRound
      key={currentIndex}
      slab={currentSlab}
      colors={colors}
      isGuided={currentIndex < guidedSlabCount}
      onGuessSubmit={onGuessSubmit}
      onProceed={onProceedToNext}
    />
  );
};

export default TutorialSlabGuesser;
