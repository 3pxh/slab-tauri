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
};

const MARK_OUTLINE_FILTER =
  'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)';

const VerdictMark: React.FC<{ passes: boolean }> = ({ passes }) => (
  <div
    className="absolute"
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
  slabSizePixels = 80
}) => (
  <div className="flex flex-wrap gap-2 justify-center">
    {entries.map(({ id, slab }) => (
      <div
        key={id}
        className="slab-list-item-pop relative flex-shrink-0"
        style={{ width: slabSizePixels, height: slabSizePixels }}
      >
        <Slab slab={slab} size="small" className="w-full h-full" colors={colors} />
        <VerdictMark passes={passesRule(slab)} />
      </div>
    ))}
  </div>
);

export default TutorialSlabList;
