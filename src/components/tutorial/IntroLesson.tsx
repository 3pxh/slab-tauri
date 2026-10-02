import React from 'react';
import { SlabData } from '../Slab';
import SlabMaker, { CellCoordinate, CoachHighlights, InputLock } from '../SlabMaker';
import SparkleBurst from './SparkleBurst';
import TutorialSlabGuesser from './TutorialSlabGuesser';
import TutorialSlabList from './TutorialSlabList';
import { useEvaluationFlight } from '../../hooks/useEvaluationFlight';
import { useTutorialGuessSession } from '../../hooks/useTutorialGuessSession';
import { useTutorialSlabEntries } from '../../hooks/useTutorialSlabEntries';
import {
  INTRO_BLUE_COLOR_INDEX,
  INTRO_COLORS,
  containsBlue,
  getRowCells,
  isRowSingleGroup
} from '../../tutorial/tutorialRules';
import {
  INTRO_BOTTOM_ROW_MERGED_SLAB,
  INTRO_GUESS_ROUNDS,
  INTRO_UNPAINTED_SLAB
} from '../../tutorial/tutorialPuzzle';

type IntroRound = 'first' | 'second' | 'readyToGuess';

type IntroStep =
  | 'waiting'
  | 'evaluated'
  | 'swipeRow'
  | 'selectRow'
  | 'paintRow'
  | 'evaluate'
  | 'guess';

type StepGuidance = {
  highlights: CoachHighlights;
  lock: InputLock;
};

const TARGET_ROW_BY_ROUND: Record<IntroRound, number> = {
  first: 0,
  second: 2,
  readyToGuess: 2
};

const ENTRANCE_DURATION_MS = 1400;
const GUESS_FLIGHT_VIEWING_MS = 0;
const INTRO_GRID_SIZE = 3;
const LIST_SLAB_SIZE_PIXELS = 72;
const GUIDED_GUESS_SLAB_COUNT = 1;
const INTRO_GUESS_LIMIT = 3;
const LAST_GUESS_ROUND_INDEX = INTRO_GUESS_ROUNDS.length - 1;

type IntroLessonProps = {
  onContinue: () => void;
};

const IntroLesson: React.FC<IntroLessonProps> = ({ onContinue }) => {
  const [round, setRound] = React.useState<IntroRound>('first');
  const [isEntering, setIsEntering] = React.useState(true);
  const [currentSlab, setCurrentSlab] = React.useState<SlabData>(INTRO_UNPAINTED_SLAB);
  const [selectedCell, setSelectedCell] = React.useState<CellCoordinate | null>(null);
  const [restoredSlab, setRestoredSlab] = React.useState<SlabData | null>(null);
  const [guessRoundIndex, setGuessRoundIndex] = React.useState(0);
  const { entries, addSlab } = useTutorialSlabEntries([], { insertAt: 'end' });
  const targetRowIndex = TARGET_ROW_BY_ROUND[round];

  const handleGuessRoundFinished = (correctCount: number, totalCount: number) => {
    const isPerfect = correctCount === totalCount;

    if (isPerfect || guessRoundIndex >= LAST_GUESS_ROUND_INDEX) {
      onContinue();
      return;
    }

    const nextRoundIndex = guessRoundIndex + 1;
    setGuessRoundIndex(nextRoundIndex);
    guessSession.startRound(INTRO_GUESS_ROUNDS[nextRoundIndex]);
  };

  const guessSession = useTutorialGuessSession({
    passesRule: containsBlue,
    onSlabGuessed: addSlab,
    onRoundFinished: handleGuessRoundFinished
  });

  const handleLanded = (slab: SlabData) => {
    if (guessSession.isGuessing) {
      guessSession.proceedToNext();
      return;
    }

    addSlab(slab);

    if (round === 'first') {
      setIsEntering(true);
      setRound('second');
      return;
    }

    setRestoredSlab(slab);
    setRound('readyToGuess');
  };

  const flight = useEvaluationFlight({ onLanded: handleLanded });

  React.useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), ENTRANCE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [round]);

  const getStep = (): IntroStep => {
    if (isEntering) return 'waiting';
    if (flight.pendingSlab) return 'evaluated';
    if (round === 'readyToGuess') return 'guess';
    if (containsBlue(currentSlab)) return 'evaluate';
    if (!isRowSingleGroup(currentSlab, targetRowIndex)) return 'swipeRow';
    if (selectedCell?.row === targetRowIndex) return 'paintRow';
    return 'selectRow';
  };

  const getGuidance = (step: IntroStep): StepGuidance => {
    const targetRowCells = getRowCells(currentSlab, targetRowIndex);

    switch (step) {
      case 'swipeRow':
        return {
          highlights: { cells: targetRowCells, showFinger: true, fingerGesture: 'swipe' },
          lock: { cells: targetRowCells }
        };
      case 'selectRow':
        return {
          highlights: { cells: targetRowCells, showFinger: true, fingerGesture: 'tap' },
          lock: { cells: targetRowCells }
        };
      case 'paintRow':
        return {
          highlights: { colorIndex: INTRO_BLUE_COLOR_INDEX, showFinger: true },
          lock: { colorIndex: INTRO_BLUE_COLOR_INDEX }
        };
      case 'evaluate':
        return {
          highlights: { evaluateButton: true, showFinger: true },
          lock: { evaluate: true }
        };
      case 'guess':
        return {
          highlights: { guessButton: true, showFinger: true },
          lock: { guess: true }
        };
      default:
        return { highlights: {}, lock: {} };
    }
  };

  const getMakerInitialSlab = (): SlabData | undefined => {
    if (round === 'second') return INTRO_BOTTOM_ROW_MERGED_SLAB;
    if (round === 'readyToGuess') return restoredSlab ?? undefined;
    return undefined;
  };

  const handleSlabChange = (slab: SlabData) => {
    setCurrentSlab(slab);
    flight.cancelIfSlabEdited(slab);
  };

  const handleGuess = () => {
    guessSession.startRound(INTRO_GUESS_ROUNDS[0]);
  };

  const requestGuessSlabFlight = () => {
    flight.begin(guessSession.slabsToGuess[guessSession.currentIndex], GUESS_FLIGHT_VIEWING_MS);
  };

  const step = getStep();
  const guidance = getGuidance(step);
  const isMakerLocked = step === 'waiting' || flight.isSlotReserved;
  const isStarShowing = flight.pendingSlab !== null && !flight.isSlotReserved;
  const isFirstTwoRounds = round !== 'readyToGuess';
  const isGuessRoundPerfect = guessSession.correctCount === guessSession.slabsToGuess.length;
  const willRetryGuessRound = !isGuessRoundPerfect && guessRoundIndex < LAST_GUESS_ROUND_INDEX;

  return (
    <div className="flex flex-col gap-4">
      {guessSession.isGuessing ? (
        <TutorialSlabGuesser
          currentSlab={guessSession.slabsToGuess[guessSession.currentIndex]}
          currentIndex={guessSession.currentIndex}
          totalSlabs={guessSession.slabsToGuess.length}
          correctCount={guessSession.correctCount}
          colors={INTRO_COLORS}
          guidedSlabCount={guessRoundIndex === 0 ? GUIDED_GUESS_SLAB_COUNT : 0}
          onGuessSubmit={guessSession.submitGuess}
          onRequestProceed={requestGuessSlabFlight}
          isProceeding={flight.pendingSlab !== null}
          flightTargetRect={flight.targetRect}
          onFlightEnd={flight.handleFlightEnd}
          onWinNext={guessSession.finishRound}
          finalActionVariant={willRetryGuessRound ? 'retry' : 'next'}
        />
      ) : (
        <div
          className={`relative max-w-xs w-full mx-auto ${isMakerLocked ? 'pointer-events-none' : ''} ${
            isFirstTwoRounds ? '' : 'fade-in'
          }`}
        >
          <SlabMaker
            key={round}
            onCreate={flight.begin}
            onEvaluate={async slab => containsBlue(slab)}
            onGuess={handleGuess}
            guessCount={INTRO_GUESS_LIMIT}
            maxGuesses={INTRO_GUESS_LIMIT}
            colors={INTRO_COLORS}
            initialGridSize={INTRO_GRID_SIZE}
            initialSlab={getMakerInitialSlab()}
            persistSlabs={false}
            entranceAnimation={isFirstTwoRounds}
            coachHighlights={guidance.highlights}
            inputLock={guidance.lock}
            onSlabChange={handleSlabChange}
            onSelectionChange={setSelectedCell}
            flightTargetRect={flight.targetRect}
            onFlightEnd={flight.handleFlightEnd}
          />
          {isStarShowing && <SparkleBurst />}
        </div>
      )}

      <div className="max-w-xs w-full mx-auto">
        <TutorialSlabList
          entries={entries}
          colors={INTRO_COLORS}
          passesRule={containsBlue}
          slabSizePixels={LIST_SLAB_SIZE_PIXELS}
          staggerMilliseconds={0}
          alignment="start"
          slotRef={flight.slotRef}
          slotPosition="end"
          isSlotOutlined
          areEntriesPulsing={guessSession.isGuessing}
        />
      </div>
    </div>
  );
};

export default IntroLesson;
