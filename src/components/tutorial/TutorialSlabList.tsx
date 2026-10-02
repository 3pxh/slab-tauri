import React from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import Slab, { SlabData } from '../Slab';
import { TutorialSlabEntry } from '../../hooks/useTutorialSlabEntries';
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
};

const REJECTED_SHAKE_DELAY_MS = 500;

const MARK_OUTLINE_FILTER =
  'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)';

const VerdictMark: React.FC<{ passes: boolean }> = ({ passes }) => (
  <div
    className="verdict-mark-pop absolute"
    style={{ top: '-8px', right: '-8px', filter: MARK_OUTLINE_FILTER }}
  >
    {passes ? (
      <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
    ) : (
      <FiX size={16} className="text-red-500" />
    )}
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
  isSlotOutlined = false
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
            className="slab-list-item-pop relative flex-shrink-0"
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
            <VerdictMark passes={passes} />
          </div>
        );
      })}
      {slotPosition === 'end' && slot}
    </div>
  );
};

export default TutorialSlabList;
