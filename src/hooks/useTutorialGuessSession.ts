import { useCallback, useState } from 'react';
import { SlabData } from '../components/Slab';

type GuessSessionOptions = {
  passesRule: (slab: SlabData) => boolean;
  onSlabGuessed: (slab: SlabData) => void;
  onRoundFinished: (correctCount: number, totalCount: number) => void;
};

export const useTutorialGuessSession = ({
  passesRule,
  onSlabGuessed,
  onRoundFinished
}: GuessSessionOptions) => {
  const [isGuessing, setIsGuessing] = useState(false);
  const [slabsToGuess, setSlabsToGuess] = useState<SlabData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const startRound = useCallback((slabs: SlabData[]) => {
    setSlabsToGuess(slabs);
    setCurrentIndex(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setLastResult(null);
    setIsGuessing(true);
  }, []);

  const submitGuess = async (guessedStar: boolean): Promise<boolean> => {
    const isCorrect = passesRule(slabsToGuess[currentIndex]) === guessedStar;
    setLastResult(isCorrect);
    return isCorrect;
  };

  const proceedToNext = async () => {
    if (lastResult === true) setCorrectCount(count => count + 1);
    if (lastResult === false) setIncorrectCount(count => count + 1);

    onSlabGuessed(slabsToGuess[currentIndex]);
    setCurrentIndex(index => index + 1);
    setLastResult(null);
  };

  const finishRound = async () => {
    setIsGuessing(false);
    setAttemptCount(count => count + 1);
    onRoundFinished(correctCount, slabsToGuess.length);
  };

  return {
    isGuessing,
    slabsToGuess,
    currentIndex,
    correctCount,
    incorrectCount,
    attemptCount,
    startRound,
    submitGuess,
    proceedToNext,
    finishRound
  };
};
