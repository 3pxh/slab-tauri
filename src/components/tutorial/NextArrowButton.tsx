import React from 'react';
import { FiArrowRight, FiRotateCw } from 'react-icons/fi';
import '../../slabAnimations.css';

type NextArrowButtonProps = {
  onClick: () => void;
  variant?: 'next' | 'retry';
};

const NextArrowButton: React.FC<NextArrowButtonProps> = ({ onClick, variant = 'next' }) => (
  <button
    onClick={onClick}
    aria-label={variant === 'retry' ? 'Try again' : 'Next'}
    className="gentle-bounce w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center"
  >
    {variant === 'retry' ? <FiRotateCw size={26} /> : <FiArrowRight size={28} />}
  </button>
);

export default NextArrowButton;
