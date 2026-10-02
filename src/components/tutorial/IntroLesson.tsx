import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { SlabData } from '../Slab';
import SlabMaker, { CoachHighlights } from '../SlabMaker';
import CoachBanner from './CoachBanner';
import TutorialSlabList from './TutorialSlabList';
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
  INTRO_SECOND_ROW_SLAB,
  INTRO_TOP_ROW_SLAB,
  INTRO_UNPAINTED_SLAB
} from '../../tutorial/tutorialPuzzle';

type IntroStage =
  | 'entering'
  | 'showingTopRow'
  | 'topRowFalling'
  | 'secondRowEntering'
  | 'interactive'
  | 'finished';

type AutomaticTransition = {
  nextStage: IntroStage;
  afterMilliseconds: number;
};

const AUTOMATIC_TRANSITIONS: Partial<Record<IntroStage, AutomaticTransition>> = {
  entering: { nextStage: 'showingTopRow', afterMilliseconds: 1700 },
  showingTopRow: { nextStage: 'topRowFalling', afterMilliseconds: 2200 },
  topRowFalling: { nextStage: 'secondRowEntering', afterMilliseconds: 700 },
  secondRowEntering: { nextStage: 'interactive', afterMilliseconds: 1500 }
};

const PLAYER_ROW_INDEX = 2;
const LIST_SLAB_SIZE_PIXELS = 72;
const STAGES_BEFORE_SECOND_SLAB: IntroStage[] = ['entering', 'showingTopRow', 'topRowFalling'];

type IntroLessonProps = {
  onContinue: () => void;
};

const IntroLesson: React.FC<IntroLessonProps> = ({ onContinue }) => {
  const [stage, setStage] = React.useState<IntroStage>('entering');
  const [currentSlab, setCurrentSlab] = React.useState<SlabData>(INTRO_SECOND_ROW_SLAB);
  const { entries, addSlab } = useTutorialSlabEntries([INTRO_UNPAINTED_SLAB]);

  React.useEffect(() => {
    const transition = AUTOMATIC_TRANSITIONS[stage];
    if (!transition) return;

    const timer = setTimeout(() => setStage(transition.nextStage), transition.afterMilliseconds);
    return () => clearTimeout(timer);
  }, [stage]);

  React.useEffect(() => {
    if (stage === 'secondRowEntering') addSlab(INTRO_TOP_ROW_SLAB);
  }, [stage, addSlab]);

  const isPlayerInControl = stage === 'interactive' || stage === 'finished';
  const isFirstSlab = STAGES_BEFORE_SECOND_SLAB.includes(stage);
  const rowIsMerged = isRowSingleGroup(currentSlab, PLAYER_ROW_INDEX);
  const rowIsBlue = getRowColorIndex(currentSlab, PLAYER_ROW_INDEX) === INTRO_BLUE_COLOR_INDEX;

  const getCoachHighlights = (): CoachHighlights => {
    if (stage !== 'interactive') return {};
    if (!rowIsMerged) return { cells: getRowCells(currentSlab, PLAYER_ROW_INDEX) };
    if (!rowIsBlue) return { colorIndex: INTRO_BLUE_COLOR_INDEX };
    return { evaluateButton: true };
  };

  const getMakerInitialSlab = (): SlabData | undefined => {
    if (stage === 'entering') return undefined;
    if (isFirstSlab) return INTRO_TOP_ROW_SLAB;
    return INTRO_SECOND_ROW_SLAB;
  };

  const getCaption = (): string => {
    switch (stage) {
      case 'entering':
        return 'This is a slab: a grid of colored regions.';
      case 'showingTopRow':
        return 'You can merge cells into regions and paint them. This slab has a blue region on top.';
      case 'topRowFalling':
      case 'secondRowEntering':
        return 'Every slab gets judged by a secret rule: ⭐ means it passes, ✗ means it does not.';
      case 'interactive':
        if (!rowIsMerged) return 'Your turn! Swipe across the glowing row to merge it into one region.';
        if (!rowIsBlue) return 'Now tap blue to paint that region.';
        return 'Tap Evaluate Slab to see if it passes.';
      case 'finished':
        return 'It passes! The secret rule was "has something blue". In a real puzzle, you work out the rule yourself.';
    }
  };

  const handleCreate = (slab: SlabData) => {
    addSlab(slab);
    if (stage === 'interactive' && containsBlue(slab)) setStage('finished');
  };

  return (
    <div className="flex flex-col gap-4">
      <CoachBanner>{getCaption()}</CoachBanner>

      <div
        className={`max-w-xs w-full mx-auto ${isPlayerInControl ? '' : 'pointer-events-none'}`}
      >
        <div className={stage === 'topRowFalling' ? 'slab-shrink-into-list' : ''}>
          <SlabMaker
            key={isFirstSlab ? 'first-slab' : 'second-slab'}
            onCreate={handleCreate}
            onEvaluate={async slab => containsBlue(slab)}
            colors={INTRO_COLORS}
            initialGridSize={3}
            initialSlab={getMakerInitialSlab()}
            persistSlabs={false}
            entranceAnimation
            coachHighlights={getCoachHighlights()}
            onSlabChange={setCurrentSlab}
          />
        </div>
      </div>

      <TutorialSlabList
        entries={entries}
        colors={INTRO_COLORS}
        passesRule={containsBlue}
        slabSizePixels={LIST_SLAB_SIZE_PIXELS}
      />

      {stage === 'finished' && (
        <button
          onClick={onContinue}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 shadow-lg flex items-center justify-center gap-2"
        >
          <span className="text-lg font-semibold">Play</span>
          <FiArrowRight size={20} />
        </button>
      )}
    </div>
  );
};

export default IntroLesson;
