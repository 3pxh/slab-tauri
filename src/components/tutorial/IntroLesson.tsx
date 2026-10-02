import React from 'react';
import { SlabData } from '../Slab';
import SlabMaker, { CoachHighlights } from '../SlabMaker';
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
  getRowColorIndex,
  isRowSingleGroup
} from '../../tutorial/tutorialRules';
import {
  INTRO_GUESS_SLABS,
  INTRO_SECOND_ROW_SLAB,
  INTRO_UNPAINTED_SLAB
} from '../../tutorial/tutorialPuzzle';

type IntroRound = 'first' | 'second';

type IntroStep = 'waiting' | 'evaluated' | 'swipeRow' | 'paintRow' | 'evaluate';

type RoundConfig = {
  initialSlab?: SlabData;
  targetRowIndex: number;
  showFinger: boolean;
};

const ROUND_CONFIGS: Record<IntroRound, RoundConfig> = {
  first: { initialSlab: undefined, targetRowIndex: 0, showFinger: true },
  second: { initialSlab: INTRO_SECOND_ROW_SLAB, targetRowIndex: 2, showFinger: false }
};

const ENTRANCE_DURATION_MS = 1400;
const INTRO_GRID_SIZE = 3;
const LIST_SLAB_SIZE_PIXELS = 72;
const GUIDED_GUESS_SLAB_COUNT = 1;

type IntroLessonProps = {
  onContinue: () => void;
};

const IntroLesson: React.FC<IntroLessonProps> = ({ onContinue }) => {
  const [round, setRound] = React.useState<IntroRound>('first');
  const [isEntering, setIsEntering] = React.useState(true);
  const [currentSlab, setCurrentSlab] = React.useState<SlabData>(INTRO_UNPAINTED_SLAB);
  const { entries, addSlab } = useTutorialSlabEntries([]);
  const { initialSlab, targetRowIndex, showFinger } = ROUND_CONFIGS[round];

  const guessSession = useTutorialGuessSession({ passesRule: containsBlue });

  const handleLanded = (slab: SlabData) => {
    addSlab(slab);

    if (round === 'first') {
      setIsEntering(true);
      setRound('second');
      return;
    }

    guessSession.startRound(INTRO_GUESS_SLABS);
  };

  const flight = useEvaluationFlight({ onLanded: handleLanded });

  React.useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), ENTRANCE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [round]);

  const getStep = (): IntroStep => {
    if (isEntering) return 'waiting';
    if (flight.pendingSlab) return 'evaluated';
    if (!isRowSingleGroup(currentSlab, targetRowIndex)) return 'swipeRow';
    if (getRowColorIndex(currentSlab, targetRowIndex) !== INTRO_BLUE_COLOR_INDEX) return 'paintRow';
    return 'evaluate';
  };

  const step = getStep();

  const getCoachHighlights = (): CoachHighlights => {
    switch (step) {
      case 'swipeRow':
        return { cells: getRowCells(currentSlab, targetRowIndex), showFinger };
      case 'paintRow':
        return { colorIndex: INTRO_BLUE_COLOR_INDEX, showFinger };
      case 'evaluate':
        return { evaluateButton: true, showFinger };
      default:
        return {};
    }
  };

  const handleCreate = (slab: SlabData) => {
    if (containsBlue(slab)) flight.begin(slab);
  };

  const handleSlabChange = (slab: SlabData) => {
    setCurrentSlab(slab);
    flight.cancelIfSlabEdited(slab);
  };

  const handleProceedToNext = async () => {
    const isLastGuessSlab = guessSession.currentIndex === INTRO_GUESS_SLABS.length - 1;
    await guessSession.proceedToNext();
    if (isLastGuessSlab) onContinue();
  };

  const isMakerLocked = step === 'waiting' || flight.isSlotReserved;
  const isStarShowing = flight.pendingSlab !== null && !flight.isSlotReserved;

  return (
    <div className="flex flex-col gap-4">
      {guessSession.isGuessing ? (
        <TutorialSlabGuesser
          currentSlab={guessSession.slabsToGuess[guessSession.currentIndex]}
          currentIndex={guessSession.currentIndex}
          totalSlabs={guessSession.slabsToGuess.length}
          correctCount={guessSession.correctCount}
          colors={INTRO_COLORS}
          guidedSlabCount={GUIDED_GUESS_SLAB_COUNT}
          onGuessSubmit={guessSession.submitGuess}
          onProceedToNext={handleProceedToNext}
          onWinNext={guessSession.finishRound}
        />
      ) : (
        <div
          className={`relative max-w-xs w-full mx-auto ${isMakerLocked ? 'pointer-events-none' : ''}`}
        >
          <SlabMaker
            key={round}
            onCreate={handleCreate}
            onEvaluate={async slab => containsBlue(slab)}
            colors={INTRO_COLORS}
            initialGridSize={INTRO_GRID_SIZE}
            initialSlab={initialSlab}
            persistSlabs={false}
            entranceAnimation
            coachHighlights={getCoachHighlights()}
            onSlabChange={handleSlabChange}
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
          isSlotOutlined={!guessSession.isGuessing}
          areEntriesPulsing={guessSession.isGuessing}
        />
      </div>
    </div>
  );
};

export default IntroLesson;
