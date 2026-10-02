import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import '../../slabAnimations.css';

type NextArrowButtonProps = {
  onClick: () => void;
};

const NextArrowButton: React.FC<NextArrowButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Next"
    className="gentle-bounce w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center"
  >
    <FiArrowRight size={28} />
  </button>
);

export default NextArrowButton;
