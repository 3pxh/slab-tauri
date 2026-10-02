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
  isRowSingleGroup
} from '../../tutorial/tutorialRules';
import {
  INTRO_BOTTOM_ROW_MERGED_SLAB,
  INTRO_GUESS_SLABS,
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
  second: { initialSlab: INTRO_BOTTOM_ROW_MERGED_SLAB, targetRowIndex: 2, showFinger: false }
};

const ENTRANCE_DURATION_MS = 1400;
const GUESS_FLIGHT_VIEWING_MS = 0;
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
  const { entries, addSlab } = useTutorialSlabEntries([], { insertAt: 'end' });
  const { initialSlab, targetRowIndex, showFinger } = ROUND_CONFIGS[round];

  const guessSession = useTutorialGuessSession({
    passesRule: containsBlue,
    onSlabGuessed: addSlab
  });

  const handleGuessSlabLanded = async () => {
    const isLastGuessSlab = guessSession.currentIndex === INTRO_GUESS_SLABS.length - 1;
    await guessSession.proceedToNext();
    if (isLastGuessSlab) onContinue();
  };

  const handleLanded = (slab: SlabData) => {
    if (guessSession.isGuessing) {
      handleGuessSlabLanded();
      return;
    }

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
    if (containsBlue(currentSlab)) return 'evaluate';
    if (isRowSingleGroup(currentSlab, targetRowIndex)) return 'paintRow';
    return 'swipeRow';
  };

  const step = getStep();
  const targetRowCells = getRowCells(currentSlab, targetRowIndex);

  const getCoachHighlights = (): CoachHighlights => {
    switch (step) {
      case 'swipeRow':
        return { cells: targetRowCells, showFinger };
      case 'paintRow':
        return {
          cells: showFinger ? undefined : targetRowCells,
          colorIndex: INTRO_BLUE_COLOR_INDEX,
          showFinger
        };
      case 'evaluate':
        return { evaluateButton: true, showFinger };
      default:
        return {};
    }
  };

  const handleSlabChange = (slab: SlabData) => {
    setCurrentSlab(slab);
    flight.cancelIfSlabEdited(slab);
  };

  const requestGuessSlabFlight = () => {
    flight.begin(guessSession.slabsToGuess[guessSession.currentIndex], GUESS_FLIGHT_VIEWING_MS);
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
          onRequestProceed={requestGuessSlabFlight}
          isProceeding={flight.pendingSlab !== null}
          flightTargetRect={flight.targetRect}
          onFlightEnd={flight.handleFlightEnd}
          onWinNext={guessSession.finishRound}
        />
      ) : (
        <div
          className={`relative max-w-xs w-full mx-auto ${isMakerLocked ? 'pointer-events-none' : ''}`}
        >
          <SlabMaker
            key={round}
            onCreate={flight.begin}
            onEvaluate={async slab => containsBlue(slab)}
            isEvaluateDisabled={!containsBlue(currentSlab)}
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
          isSlotOutlined
          areEntriesPulsing={guessSession.isGuessing}
        />
      </div>
    </div>
  );
};

export default IntroLesson;
