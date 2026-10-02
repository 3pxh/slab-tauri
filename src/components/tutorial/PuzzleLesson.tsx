import React from 'react';
import { FiHelpCircle, FiStar } from 'react-icons/fi';
import Slab, { COLORS, SlabData, createSlab } from '../Slab';
import SlabMaker, { CoachHighlights } from '../SlabMaker';
import CoachBanner from './CoachBanner';
import NextArrowButton from './NextArrowButton';
import SparkleBurst from './SparkleBurst';
import TutorialSlabGuesser from './TutorialSlabGuesser';
import TutorialSlabList from './TutorialSlabList';
import { useEvaluationFlight } from '../../hooks/useEvaluationFlight';
import { useIdleFlag } from '../../hooks/useIdleFlag';
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
  PUZZLE_REVEAL_SLAB,
  TEXT_HINTS
} from '../../tutorial/tutorialPuzzle';

const TUTORIAL_GUESS_LIMIT = 3;
const GUIDED_GUESS_SLAB_COUNT = 0;
const HINT_NUDGE_DELAY_MS = 7000;

type RoundScore = {
  correctCount: number;
  totalCount: number;
};

const getHintBubbleText = (hintLevel: number): string => {
  const isTextHint = hintLevel < FIRST_VISUAL_HINT_LEVEL;
  return isTextHint ? `💡 ${TEXT_HINTS[hintLevel - 1]}` : '💡 👆';
};

type PuzzleLessonProps = {
  onFinish: () => void;
};

const PuzzleLesson: React.FC<PuzzleLessonProps> = ({ onFinish }) => {
  const [currentSlab, setCurrentSlab] = React.useState<SlabData>(() => createSlab());
  const [hintLevel, setHintLevel] = React.useState(0);
  const [hasEvaluatedStar, setHasEvaluatedStar] = React.useState(false);
  const [lastRoundScore, setLastRoundScore] = React.useState<RoundScore | null>(null);
  const [isSolved, setIsSolved] = React.useState(false);
  const [makerKey, setMakerKey] = React.useState(0);
  const [restoredSlab, setRestoredSlab] = React.useState<SlabData | null>(null);
  const { entries, addSlab } = useTutorialSlabEntries(PUZZLE_EXAMPLE_SLABS);

  const handleLanded = (slab: SlabData) => {
    addSlab(slab);
    setRestoredSlab(slab);
    setMakerKey(key => key + 1);
  };

  const flight = useEvaluationFlight({ onLanded: handleLanded });

  const guessSession = useTutorialGuessSession({
    passesRule: everyRowIsSingleGroup,
    onSlabGuessed: addSlab,
    onRoundFinished: (correctCount, totalCount) => {
      if (correctCount === totalCount) {
        setIsSolved(true);
        return;
      }

      setLastRoundScore({ correctCount, totalCount });
    }
  });

  const shouldNudgeHint = useIdleFlag(HINT_NUDGE_DELAY_MS, [currentSlab, hintLevel, entries.length]);
  const isShowingVisualHint = hintLevel >= FIRST_VISUAL_HINT_LEVEL;
  const rainbowTarget: RainbowRowTarget | null = isShowingVisualHint
    ? findNextRainbowRow(currentSlab)
    : null;

  const getCoachHighlights = (): CoachHighlights => {
    if (rainbowTarget) {
      return {
        cells: getRowCells(currentSlab, rainbowTarget.rowIndex),
        colorIndex: rainbowTarget.colorIndex,
        showFinger: true
      };
    }

    if (isShowingVisualHint && !hasEvaluatedStar) {
      return { evaluateButton: true, showFinger: true };
    }

    return { guessButton: hasEvaluatedStar, showFinger: hasEvaluatedStar };
  };

  const handleCreate = (slab: SlabData) => {
    setLastRoundScore(null);
    if (everyRowIsSingleGroup(slab)) setHasEvaluatedStar(true);
    flight.begin(slab);
  };

  const handleSlabChange = (slab: SlabData) => {
    setCurrentSlab(slab);
    flight.cancelIfSlabEdited(slab);
  };

  const handleGuess = () => {
    flight.handleFlightEnd();
    setLastRoundScore(null);
    guessSession.startRound(GUESS_ROUNDS[guessSession.attemptCount % GUESS_ROUNDS.length]);
  };

  const handleHint = () => {
    setLastRoundScore(null);
    setHintLevel(level => level + 1);
  };

  if (isSolved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative rounded-lg bg-yellow-50 border border-yellow-300 p-6 flex flex-col items-center gap-4">
          <div className="text-5xl">🎉</div>
          <div className="relative">
            <Slab slab={PUZZLE_REVEAL_SLAB} size="medium" colors={COLORS} className="shadow-lg" />
            <FiStar size={36} className="absolute -top-4 -right-4 fill-yellow-400 text-yellow-500" />
          </div>
          <NextArrowButton onClick={onFinish} />
          <SparkleBurst />
        </div>
        <TutorialSlabList entries={entries} colors={COLORS} passesRule={everyRowIsSingleGroup} />
      </div>
    );
  }

  const hintButton = (
    <button
      onClick={handleHint}
      aria-label="Hint"
      className={`flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white ${
        shouldNudgeHint ? 'idle-wiggle' : ''
      }`}
    >
      <FiHelpCircle size={20} />
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {!guessSession.isGuessing && (
        <div className="flex items-center justify-end gap-3">
          {lastRoundScore && (
            <span className="text-lg font-semibold text-gray-600">
              🤔 {lastRoundScore.correctCount}/{lastRoundScore.totalCount}
            </span>
          )}
          {hintButton}
        </div>
      )}

      {hintLevel > 0 && !guessSession.isGuessing && (
        <CoachBanner>{getHintBubbleText(hintLevel)}</CoachBanner>
      )}

      {guessSession.isGuessing ? (
        <TutorialSlabGuesser
          currentSlab={guessSession.slabsToGuess[guessSession.currentIndex]}
          currentIndex={guessSession.currentIndex}
          totalSlabs={guessSession.slabsToGuess.length}
          correctCount={guessSession.correctCount}
          colors={COLORS}
          guidedSlabCount={GUIDED_GUESS_SLAB_COUNT}
          onGuessSubmit={guessSession.submitGuess}
          onProceedToNext={guessSession.proceedToNext}
          onWinNext={guessSession.finishRound}
        />
      ) : (
        <div
          key={makerKey}
          className={`${restoredSlab ? 'fade-in' : ''} ${flight.isSlotReserved ? 'pointer-events-none' : ''}`}
        >
          <SlabMaker
            onCreate={handleCreate}
            onEvaluate={async slab => everyRowIsSingleGroup(slab)}
            onGuess={handleGuess}
            guessCount={TUTORIAL_GUESS_LIMIT}
            maxGuesses={TUTORIAL_GUESS_LIMIT}
            colors={COLORS}
            persistSlabs={false}
            initialSlab={restoredSlab ?? undefined}
            coachHighlights={getCoachHighlights()}
            onSlabChange={handleSlabChange}
            flightTargetRect={flight.targetRect}
            onFlightEnd={flight.handleFlightEnd}
          />
        </div>
      )}

      <TutorialSlabList
        entries={entries}
        colors={COLORS}
        passesRule={everyRowIsSingleGroup}
        slotRef={flight.isSlotReserved ? flight.slotRef : undefined}
      />
    </div>
  );
};

export default PuzzleLesson;
