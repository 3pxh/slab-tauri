import React from 'react';
import { FiCheck, FiStar, FiX } from 'react-icons/fi';

type IconProps = {
  isStar: boolean;
};

const CIRCLE_BASE_CLASSES = 'w-16 h-16 rounded-full flex items-center justify-center';
const TRUTH_ICON_SIZE_PX = 64;
const BADGE_BORDER_COLOR = '#d1d5db';

type VerdictBadgeProps = IconProps & {
  sizePx: number;
  className?: string;
};

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ isStar, sizePx, className = '' }) => (
  <div
    className={`rounded-full bg-white flex items-center justify-center shadow-md ${className}`}
    style={{
      width: sizePx,
      height: sizePx,
      border: `${Math.max(1, sizePx / 32)}px solid ${BADGE_BORDER_COLOR}`
    }}
  >
    {isStar ? (
      <FiStar size={sizePx * 0.55} className="fill-yellow-400 text-yellow-500" />
    ) : (
      <FiX size={sizePx * 0.6} className="text-red-500" />
    )}
  </div>
);

export const TruthIcon: React.FC<IconProps> = ({ isStar }) => (
  <VerdictBadge isStar={isStar} sizePx={TRUTH_ICON_SIZE_PX} />
);

export const GuessIcon: React.FC<IconProps> = ({ isStar }) => (
  <div
    className={`${CIRCLE_BASE_CLASSES} border-4 shadow-xl ${
      isStar ? 'bg-yellow-300 border-yellow-400' : 'bg-red-300 border-red-400'
    }`}
  >
    {isStar ? (
      <FiStar size={24} className="text-yellow-800 fill-yellow-800" />
    ) : (
      <FiX size={24} className="text-red-800" />
    )}
  </div>
);

export const EmptyIconSlot: React.FC = () => (
  <div className={`${CIRCLE_BASE_CLASSES} border-2 border-dashed border-gray-300`} />
);

export const CoverDisc: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`${CIRCLE_BASE_CLASSES} bg-gray-300 border-2 border-gray-400 text-2xl font-bold text-white shadow-inner ${className}`}
  >
    ?
  </div>
);

export const ComparisonIcon: React.FC<{ isMatch: boolean }> = ({ isMatch }) => (
  <div
    className={`pop-in w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${
      isMatch ? 'bg-green-500' : 'bg-red-500'
    }`}
  >
    {isMatch ? <FiCheck size={24} /> : <FiX size={22} />}
  </div>
);
