import React from 'react';
import Slab, { SlabData } from '../Slab';
import { TutorialSlabEntry } from '../../hooks/useTutorialSlabEntries';
import { VerdictBadge } from './GuessIcons';
import '../../slabAnimations.css';

type TutorialSlabListProps = {
  entries: TutorialSlabEntry[];
  colors: string[];
  passesRule: (slab: SlabData) => boolean;
  slabSizePixels?: number;
  staggerMilliseconds?: number;
  alignment?: 'center' | 'start';
  slotRef?: React.RefObject<HTMLDivElement>;
  slotPosition?: 'start' | 'end';
  isSlotOutlined?: boolean;
  areEntriesPulsing?: boolean;
  onSlabClick?: (slab: SlabData) => void;
};

const REJECTED_SHAKE_DELAY_MS = 500;

const LIST_BADGE_SIZE_PX = 20;

const VerdictMark: React.FC<{ passes: boolean }> = ({ passes }) => (
  <div className="verdict-fade-in absolute" style={{ top: '-8px', right: '-8px' }}>
    <VerdictBadge isStar={passes} sizePx={LIST_BADGE_SIZE_PX} />
  </div>
);

const TutorialSlabList: React.FC<TutorialSlabListProps> = ({
  entries,
  colors,
  passesRule,
  slabSizePixels = 80,
  staggerMilliseconds = 120,
  alignment = 'center',
  slotRef,
  slotPosition = 'start',
  isSlotOutlined = false,
  areEntriesPulsing = false,
  onSlabClick
}) => {
  const slot = slotRef && (
    <div
      ref={slotRef}
      className={`flex-shrink-0 rounded-sm ${
        isSlotOutlined ? 'border-2 border-dashed border-gray-300' : 'invisible'
      }`}
      style={{ width: slabSizePixels, height: slabSizePixels }}
    />
  );

  return (
    <div className={`flex flex-wrap gap-2 ${alignment === 'center' ? 'justify-center' : 'justify-start'}`}>
      {slotPosition === 'start' && slot}
      {entries.map(({ id, slab }, index) => {
        const passes = passesRule(slab);

        return (
          <div
            key={id}
            className={`slab-list-item-pop relative flex-shrink-0 ${
              onSlabClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-opacity-50 rounded-sm' : ''
            }`}
            onClick={onSlabClick ? () => onSlabClick(slab) : undefined}
            style={{
              width: slabSizePixels,
              height: slabSizePixels,
              animationDelay: `${index * staggerMilliseconds}ms`
            }}
          >
            <div
              className={`w-full h-full ${passes ? '' : 'slab-shake'}`}
              style={{ animationDelay: `${REJECTED_SHAKE_DELAY_MS + index * staggerMilliseconds}ms` }}
            >
              <Slab slab={slab} size="small" className="w-full h-full" colors={colors} />
            </div>
            {areEntriesPulsing && (
              <div className="coach-pulse-ring-brief absolute inset-0 rounded-sm pointer-events-none" />
            )}
            <VerdictMark passes={passes} />
          </div>
        );
      })}
      {slotPosition === 'end' && slot}
    </div>
  );
};

export default TutorialSlabList;
