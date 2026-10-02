import React from 'react';
import { FiCheck, FiStar, FiX } from 'react-icons/fi';

type IconProps = {
  isStar: boolean;
};

const CIRCLE_BASE_CLASSES = 'w-16 h-16 rounded-full flex items-center justify-center';

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

export const TruthIcon: React.FC<IconProps> = ({ isStar }) => (
  <div className={`${CIRCLE_BASE_CLASSES} bg-white border-2 border-gray-300 shadow-md`}>
    {isStar ? (
      <FiStar size={30} className="fill-yellow-400 text-yellow-500" />
    ) : (
      <FiX size={30} className="text-red-500" />
    )}
  </div>
);

export const EmptyIconSlot: React.FC = () => (
  <div className={`${CIRCLE_BASE_CLASSES} border-2 border-dashed border-gray-300`} />
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
