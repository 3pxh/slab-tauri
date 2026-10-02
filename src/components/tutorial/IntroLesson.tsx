import React from 'react';
import { SlabData } from '../Slab';
import SlabMaker, { CoachHighlights } from '../SlabMaker';
import NextArrowButton from './NextArrowButton';
import SparkleBurst from './SparkleBurst';
import TutorialSlabList from './TutorialSlabList';
import { useEvaluationFlight } from '../../hooks/useEvaluationFlight';
import { useTutorialSlabEntries } from '../../hooks/useTutorialSlabEntries';
import {
  INTRO_BLUE_COLOR_INDEX,
  INTRO_COLORS,
  containsBlue,
  getRowCells,
  getRowColorIndex,
  isRowSingleGroup
} from '../../tutorial/tutorialRules';
import { INTRO_SECOND_ROW_SLAB, INTRO_UNPAINTED_SLAB } from '../../tutorial/tutorialPuzzle';

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

type IntroLessonProps = {
  onContinue: () => void;
};

const IntroLesson: React.FC<IntroLessonProps> = ({ onContinue }) => {
  const [round, setRound] = React.useState<IntroRound>('first');
  const [isEntering, setIsEntering] = React.useState(true);
  const [isFinished, setIsFinished] = React.useState(false);
  const [currentSlab, setCurrentSlab] = React.useState<SlabData>(INTRO_UNPAINTED_SLAB);
  const { entries, addSlab } = useTutorialSlabEntries([]);
  const { initialSlab, targetRowIndex, showFinger } = ROUND_CONFIGS[round];

  const handleLanded = (slab: SlabData) => {
    addSlab(slab);

    if (round === 'first') {
      setIsEntering(true);
      setRound('second');
      return;
    }

    setIsFinished(true);
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

  const isMakerLocked = step === 'waiting' || flight.isSlotReserved;
  const isStarShowing = flight.pendingSlab !== null && !flight.isSlotReserved;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative max-w-xs w-full mx-auto ${isMakerLocked ? 'pointer-events-none' : ''} ${
          isFinished ? 'invisible' : ''
        }`}
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

      <div className="h-16 flex justify-center items-center">
        {isFinished && <NextArrowButton onClick={onContinue} />}
      </div>

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
          isSlotOutlined={!isFinished}
        />
      </div>
    </div>
  );
};

export default IntroLesson;
