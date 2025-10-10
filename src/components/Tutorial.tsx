import React from 'react';
import favicon from '../assets/favicon.png';
import SlabMaker from './SlabMaker';
import { createSlab, SlabData } from './Slab';
import { useSpring, animated } from '@react-spring/web';
import { FaHandPointer } from 'react-icons/fa';

interface TutorialProps {
  onComplete: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  showNext?: boolean;
  showPrevious?: boolean;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [demoSlab] = React.useState(() => createSlab());
  const [finalDemoSlab, setFinalDemoSlab] = React.useState<SlabData | null>(null);
  const [previousGroupCount, setPreviousGroupCount] = React.useState(0);
  const [tutorialStage, setTutorialStage] = React.useState<'drag' | 'color' | 'double-tap'>('drag');

  // Function to check if there's a group of size 3 or larger (any color)
  const checkForLargeGroup = (slab: SlabData): boolean => {
    const groupSizes: Record<number, number> = {};
    
    // Count cells in each group
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const groupId = slab.cells[row][col].groupId;
        groupSizes[groupId] = (groupSizes[groupId] || 0) + 1;
      }
    }
    
    // Check if any group has 3 or more cells
    return Object.values(groupSizes).some(size => size >= 4);
  };

  // Function to check if there's a colored group of size 3 or larger
  const checkForLargeColoredGroup = (slab: SlabData): boolean => {
    const groupSizes: Record<number, number> = {};
    
    // Count cells in each group
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const groupId = slab.cells[row][col].groupId;
        groupSizes[groupId] = (groupSizes[groupId] || 0) + 1;
      }
    }
    
    // Check if any group with color index > 0 has 3 or more cells
    return Object.entries(groupSizes).some(([groupId, size]) => {
      const group = slab.groups[parseInt(groupId)];
      return group && group.color > 0 && size >= 3;
    });
  };

  // Function to count groups of size 1
  const countSingleGroups = (slab: SlabData): number => {
    const groupSizes: Record<number, number> = {};
    
    // Count cells in each group
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const groupId = slab.cells[row][col].groupId;
        groupSizes[groupId] = (groupSizes[groupId] || 0) + 1;
      }
    }
    
    // Count groups with exactly 1 cell
    return Object.values(groupSizes).filter(size => size === 1).length;
  };

  // Handle slab updates
  const handleSlabUpdate = (slab: SlabData) => {
    const hasLarge = checkForLargeGroup(slab);
    const hasLargeColored = checkForLargeColoredGroup(slab);
    const currentSingleGroups = countSingleGroups(slab);
    
    // Switch to color stage after creating a large group (any color)
    if (hasLarge && tutorialStage === 'drag') {
      setTutorialStage('color');
      setPreviousGroupCount(currentSingleGroups);
    }
    
    // Switch to double-tap stage after coloring a large group
    if (hasLargeColored && tutorialStage === 'color') {
      setTutorialStage('double-tap');
      setPreviousGroupCount(currentSingleGroups);
    }
    
    // Detect double-tap: more single groups than before
    if (tutorialStage === 'double-tap' && currentSingleGroups > previousGroupCount) {
      // Store the final demo slab state before progressing
      setFinalDemoSlab(slab);
      // Auto-progress to next step after successful double-tap
      setTimeout(() => {
        setCurrentStep(2);
      }, 1000); // Small delay to let user see the result
    }
    
    // Update previous group count for next comparison
    setPreviousGroupCount(currentSingleGroups);
  };

  // Drag animation - moves from left to right across the slab
  const dragAnimation = useSpring({
    from: { 
      x: -100, 
      opacity: 0 
    },
    to: async (next) => {
      while (true) {
        // Fade in at start position
        await next({ x: -100, opacity: 1, config: { duration: 200 } });
        // Move to end position
        await next({ x: 100, opacity: 1, config: { duration: 1500 } });
        // Fade out at end position
        await next({ x: 100, opacity: 0, config: { duration: 200 } });
        // Reset to start position (invisible)
        await next({ x: -100, opacity: 0, config: { duration: 100 } });
      }
    },
    config: { 
      tension: 120,
      friction: 14
    }
  });

  // Color animation - fades in/out in the middle of color chips
  const colorAnimation = useSpring({
    from: { 
      opacity: 0 
    },
    to: async (next) => {
      while (true) {
        // Fade in at center position
        await next({ opacity: 1, config: { duration: 1000 } });
        // Fade out at center position
        await next({ opacity: 0, config: { duration: 1000 } });
        // Reset (invisible)
      }
    },
    config: { 
      tension: 120,
      friction: 14
    }
  });

  // Double-tap animation - quick double tap gesture
  const doubleTapAnimation = useSpring({
    from: { 
      scale: 1,
      opacity: 0 
    },
    to: async (next) => {
      while (true) {
        // Fade in
        await next({ opacity: 1, config: { duration: 200 } });
        // First tap
        await next({ scale: 1.2, config: { duration: 150 } });
        await next({ scale: 1, config: { duration: 150 } });
        // Second tap
        await next({ scale: 1.2, config: { duration: 150 } });
        await next({ scale: 1, config: { duration: 150 } });
        // Fade out
        await next({ opacity: 0, config: { duration: 200 } });
        // Pause before repeating
        await next({ scale: 1, opacity: 0, config: { duration: 1000 } });
      }
    },
    config: { 
      tension: 120,
      friction: 14
    }
  });

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Slab 17',
      content: 'Slab 17 is a puzzle game about discovering the truth.',
      showNext: true,
      showPrevious: false
    },
    {
      id: 'how-to-play',
      title: 'This is a Slab',
      content: 'A Slab is a grid where you can drag to merge groups of the same color.',
      showNext: true,
      showPrevious: true
    },
    {
      id: 'secret-rule',
      title: 'Each level has a secret rule',
      content: 'Slabs following the rule are marked with ducks. Take a look at the slabs below.',
      showNext: true,
      showPrevious: true
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: 'Ready to begin? Choose a date and start solving puzzles. Good luck!',
      showNext: false,
      showPrevious: true
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="w-full max-w-md mx-auto p-4 h-full flex flex-col">
      {/* App Header */}
      <div className="flex items-center justify-center mb-6">
        <img 
          src={favicon} 
          alt="Slab! App Icon" 
          className="w-12 h-12 rounded-lg mr-3"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Slab 17</h1>
          <p className="text-sm text-gray-600 italic">a formal imagining</p>
        </div>
      </div>

      {/* Tutorial Content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            {currentStep !== 1 ? currentStepData.content : tutorialStage === 'drag' 
                ? "Drag to combine groups" 
                : tutorialStage === 'color'
                ? "Tap to select a color"
                : "Double-tap to break cells apart"}
          </p>
        </div>

        {/* SlabMaker Demo for step 1 */}
        {currentStep === 1 && (
          <div className="mb-8">
            <div className="relative">
              <SlabMaker 
                onCreate={() => {}} 
                initialSlab={demoSlab}
                colors={['#9e9e9e', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa']}
                onUpdateSlab={handleSlabUpdate}
              />
              
              {/* Drag animation - shows when in drag stage */}
              {tutorialStage === 'drag' && (
                <animated.div 
                  className="absolute top-1/2 left-1/2 transform -translate-y-1/2"
                  style={{
                    x: dragAnimation.x,
                    y: -30,
                    opacity: dragAnimation.opacity
                  }}
                >
                  <FaHandPointer className="w-8 h-8 text-blue-500" />
                </animated.div>
              )}
              
              {/* Color animation - shows when in color stage */}
              {tutorialStage === 'color' && (
                <animated.div 
                  className="absolute top-0 left-1/2 z-100"
                  style={{
                    y: 50,
                    opacity: colorAnimation.opacity
                  }}
                >
                  <FaHandPointer className="w-8 h-8 text-blue-500" />
                </animated.div>
              )}
              
              {/* Double-tap animation - shows when in double-tap stage */}
              {tutorialStage === 'double-tap' && (
                <animated.div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-100"
                  style={{
                    scale: doubleTapAnimation.scale,
                    opacity: doubleTapAnimation.opacity,
                    y: -30,
                  }}
                >
                  <FaHandPointer className="w-8 h-8 text-blue-500" />
                </animated.div>
              )}
            </div>
            <p className="text-center text-gray-600 mt-4 font-medium">
              
            </p>
          </div>
        )}

        {/* SlabMaker Demo for step 2 (secret rule) */}
        {currentStep === 2 && finalDemoSlab && (
          <div className="mb-8">
            <SlabMaker 
              onCreate={() => {}} 
              initialSlab={finalDemoSlab}
              colors={['#9e9e9e', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa']}
              onUpdateSlab={() => {}}
            />
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8 mt-8">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={!currentStepData.showPrevious}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStepData.showPrevious
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center space-x-2"
        >
          <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
          {currentStep < steps.length - 1 && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default Tutorial;
