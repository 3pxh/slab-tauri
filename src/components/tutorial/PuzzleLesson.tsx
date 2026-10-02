import React from 'react';
import { FiAward, FiHelpCircle } from 'react-icons/fi';
import { COLORS, SlabData, createSlab } from '../Slab';
import SlabMaker, { CoachHighlights } from '../SlabMaker';
import IndividualSlabGuesser from '../IndividualSlabGuesser';
import CoachBanner from './CoachBanner';
import TutorialSlabList from './TutorialSlabList';
import { useTutorialSlabEntries } from '../../hooks/useTutorialSlabEntries';
import { useTutorialGuessSession } from '../../hooks/useTutorialGuessSession';
import {
  RainbowRowTarget,
  everyRowIsSingleGroup,
  findNextRainbowRow,
  getRowCells
} from '../../tutorial/tutorialRules';
import {
  FIRST_VISUAL_HINT_LEVEL,
  GUESS_ROUNDS,
  PUZZLE_EXAMPLE_SLABS,
  PUZZLE_RULE_DESCRIPTION,
  TEXT_HINTS
} from '../../tutorial/tutorialPuzzle';

const TUTORIAL_GUESS_LIMIT = 3;

const getHintMessage = (hintLevel: number, rainbowTarget: RainbowRowTarget | null): string => {
  if (hintLevel < FIRST_VISUAL_HINT_LEVEL) {
    return `Hint ${hintLevel}: ${TEXT_HINTS[hintLevel - 1]}`;
  }

  if (rainbowTarget === null) {
    return `Hint ${hintLevel}: That's the whole rainbow! Tap Evaluate Slab.`;
  }

  return `Hint ${hintLevel}: Follow the glow. Merge the glowing row, then paint it the glowing color.`;
};

type PuzzleLessonProps = {
  onFinish: () => void;
};

const PuzzleLesson: React.FC<PuzzleLessonProps> = ({ onFinish }) => {
  const [currentSlab, setCurrentSlab] = React.useState<SlabData>(() => createSlab());
  const [hintLevel, setHintLevel] = React.useState(0);
  const [hasEvaluatedStar, setHasEvaluatedStar] = React.useState(false);
  const [roundFeedback, setRoundFeedback] = React.useState<string | null>(null);
  const [isSolved, setIsSolved] = React.useState(false);
  const { entries, addSlab } = useTutorialSlabEntries(PUZZLE_EXAMPLE_SLABS);

  const guessSession = useTutorialGuessSession({
    passesRule: everyRowIsSingleGroup,
    onSlabGuessed: addSlab,
    onRoundFinished: (correctCount, totalCount) => {
      if (correctCount === totalCount) {
        setIsSolved(true);
        return;
      }

      setRoundFeedback(
        `You got ${correctCount} of ${totalCount}. Not quite! Keep experimenting, or tap Hint, then try again.`
      );
    }
  });

  const isShowingVisualHint = hintLevel >= FIRST_VISUAL_HINT_LEVEL;
  const rainbowTarget = isShowingVisualHint ? findNextRainbowRow(currentSlab) : null;

  const getCoachHighlights = (): CoachHighlights => {
    if (rainbowTarget) {
      return {
        cells: getRowCells(currentSlab, rainbowTarget.rowIndex),
        colorIndex: rainbowTarget.colorIndex
      };
    }

    if (isShowingVisualHint && !hasEvaluatedStar) return { evaluateButton: true };
    return { guessButton: hasEvaluatedStar };
  };

  const getBannerMessage = (): string => {
    if (roundFeedback) return roundFeedback;
    if (hintLevel > 0) return getHintMessage(hintLevel, rainbowTarget);
    if (hasEvaluatedStar) {
      return 'A star! Think you know the rule? Tap Guess to test yourself on 5 slabs.';
    }
    return 'Now a real puzzle. What do the ⭐ slabs have in common? Build slabs to test your ideas.';
  };

  const handleCreate = (slab: SlabData) => {
    addSlab(slab);
    setRoundFeedback(null);
    if (everyRowIsSingleGroup(slab)) setHasEvaluatedStar(true);
  };

  const handleGuess = () => {
    setRoundFeedback(null);
    guessSession.startRound(GUESS_ROUNDS[guessSession.attemptCount % GUESS_ROUNDS.length]);
  };

  const handleHint = () => {
    setRoundFeedback(null);
    setHintLevel(level => level + 1);
  };

  const hintButton = (
    <button
      onClick={handleHint}
      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium"
    >
      <FiHelpCircle size={16} />
      Hint
    </button>
  );

  if (isSolved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-6 text-center">
          <FiAward size={40} className="mx-auto mb-2 text-yellow-500 fill-yellow-300" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">You solved it!</h2>
          <p className="text-gray-700 mb-4">{PUZZLE_RULE_DESCRIPTION}</p>
          <p className="text-gray-600 text-sm mb-6">
            A new puzzle with a new secret rule arrives every day. Have fun!
          </p>
          <button
            onClick={onFinish}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 shadow-lg text-lg font-semibold"
          >
            Start playing
          </button>
        </div>
        <TutorialSlabList entries={entries} colors={COLORS} passesRule={everyRowIsSingleGroup} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CoachBanner action={guessSession.isGuessing ? undefined : hintButton}>
        {getBannerMessage()}
      </CoachBanner>

      {guessSession.isGuessing ? (
        <IndividualSlabGuesser
          currentSlab={guessSession.slabsToGuess[guessSession.currentIndex]}
          currentIndex={guessSession.currentIndex}
          totalSlabs={guessSession.slabsToGuess.length}
          correctCount={guessSession.correctCount}
          incorrectCount={guessSession.incorrectCount}
          onGuessSubmit={guessSession.submitGuess}
          onProceedToNext={guessSession.proceedToNext}
          onWinNext={guessSession.finishRound}
          colors={COLORS}
          colorblindMode="none"
          getColorblindOverlay={() => null}
          levelAttempts={guessSession.attemptCount}
        />
      ) : (
        <SlabMaker
          onCreate={handleCreate}
          onEvaluate={async slab => everyRowIsSingleGroup(slab)}
          onGuess={handleGuess}
          guessCount={TUTORIAL_GUESS_LIMIT}
          maxGuesses={TUTORIAL_GUESS_LIMIT}
          colors={COLORS}
          persistSlabs={false}
          coachHighlights={getCoachHighlights()}
          onSlabChange={setCurrentSlab}
        />
      )}

      <TutorialSlabList entries={entries} colors={COLORS} passesRule={everyRowIsSingleGroup} />
    </div>
  );
};

export default PuzzleLesson;
