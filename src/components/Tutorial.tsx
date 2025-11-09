import React from 'react';
import { FiArrowRight, FiArrowLeft, FiRefreshCw, FiStar, FiX } from 'react-icons/fi';
import { analytics } from '../utils/analytics';
import SlabComponent, { SlabData, createRandomSlab, COLORS, deserializeSlab } from './Slab';
import SlabMaker from './SlabMaker';
import { getPuzzle, getAllDates, Puzzle } from '../lib/supabase';
import { executeCodeSafely } from '../utils/sandbox';
import favicon from '../assets/favicon.png';

interface TutorialProps {
  onFirstPuzzle: () => void;
  onHome: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onFirstPuzzle, onHome }) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [randomSlab, setRandomSlab] = React.useState<SlabData>(() => createRandomSlab());
  const [finalPanelSlab, setFinalPanelSlab] = React.useState<SlabData>(() => createRandomSlab());
  const [firstPuzzle, setFirstPuzzle] = React.useState<Puzzle | null>(null);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = React.useState(false);
  const [evaluationResults, setEvaluationResults] = React.useState<Map<string, boolean>>(new Map());
  
  // (smiley face slab removed)

  const steps = [
    {
      title: "Welcome to Slab!",
      content: "Slab is a daily puzzle game where each challenge offers a different perspective and a new mystery to solve.",
      showSlab: false
    },
    {
      title: "This is a Slab",
      content: "Slabs are grids divided into colorful regions.",
      showSlab: true
    },
    {
      title: "How to make slabs",
      content: "Try to drag, double-tap, and add colors.",
      showSlab: false,
      showSlabMaker: true
    },
    {
      title: "The Puzzles",
      content: "Each puzzle has a secret rule that sorts slabs into stars and X's. The rule might be anything, like 'it has to have a red cell' or 'no groups can be bigger than 4 cells' or 'a blue group must touch a yellow group', and every day has a different rule. You start with a couple examples and need to make more slabs to learn about the rule by getting them judged. Your job isn't to make perfect slabs, but to experiment: build different slabs to learn what the rule could be.",
      showSlab: false,
      showExamples: true
    },
    {
      title: "How to Win",
      content: "When you think you understand what the rule is, try guessing. You'll see 5 slabs. If you correctly guess which ones pass the rule, you win! You get 3 tries, and you can't build new slabs while you have a guess in progress.",
      showSlab: false,
      showGuessButton: true
    },
    {
      title: "Have fun!",
      content: "Are you ready for the challenge?",
      showSlab: false
    }
  ];

  // Track tutorial start
  React.useEffect(() => {
    analytics.tutorialStarted();
  }, []);

  // Fetch the first puzzle when component mounts
  React.useEffect(() => {
    const fetchFirstPuzzle = async () => {
      setIsLoadingPuzzle(true);
      try {
        const response = await getAllDates();
        if (response.success && response.dates.length > 0) {
          const firstDateStr = response.dates[0];
          const firstDate = new Date(firstDateStr);
          
          const year = firstDate.getUTCFullYear();
          const month = firstDate.getUTCMonth();
          const day = firstDate.getUTCDate();
          const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
          const timestamp = endOfDay.toISOString();
          
          const puzzleResponse = await getPuzzle(timestamp);
          if (puzzleResponse.success && puzzleResponse.puzzle) {
            setFirstPuzzle(puzzleResponse.puzzle);
            
            // Evaluate the shown examples to determine which ones should have stars
            if (puzzleResponse.puzzle.shown_examples && puzzleResponse.puzzle.evaluate_fn) {
              const results = new Map<string, boolean>();
              
              for (const example of puzzleResponse.puzzle.shown_examples) {
                try {
                  // Deserialize if needed
                  const isSerialized = example && typeof example === 'object' && 'grid' in example && 'colors' in example;
                  const deserializedExample = isSerialized ? deserializeSlab(example) : example;
                  const result = await executeCodeSafely(puzzleResponse.puzzle.evaluate_fn, deserializedExample, 5000);
                  if (result.success) {
                    const key = JSON.stringify(deserializedExample);
                    results.set(key, result.result);
                  }
                } catch (error) {
                  console.error('Error evaluating example slab:', error);
                }
              }
              
              setEvaluationResults(results);
            }
          }
        }
      } catch (error) {
        console.error('Error loading first puzzle for tutorial:', error);
      } finally {
        setIsLoadingPuzzle(false);
      }
    };

    fetchFirstPuzzle();
  }, []);

  // Function to generate a new random slab
  const generateNewSlab = () => {
    setRandomSlab(createRandomSlab());
  };

  // Randomize slab on final panel every second
  React.useEffect(() => {
    const isFinalPanel = currentStep === steps.length - 1;
    if (!isFinalPanel) return;

    const interval = setInterval(() => {
      setFinalPanelSlab(createRandomSlab());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep]);

  // Generic next handler
  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      // Last step - complete tutorial and start first puzzle
      analytics.tutorialCompleted();
      onFirstPuzzle();
    } else {
      // Move to next step
      setCurrentStep(currentStep + 1);
    }
  };

  // Generic back handler
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };


  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col">
      {/* Scrollable Tutorial Content */}
      <div className="flex-1 overflow-hidden">
        <div className="relative w-full h-full">
          {/* All steps rendered horizontally */}
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentStep * 100}%)` }}
          >
            {steps.map((step, index) => (
              <div 
                key={index}
                className="w-full flex-shrink-0 flex flex-col items-center px-4 justify-start overflow-y-auto pb-8"
              >
                {/* App Icon (only on first panel) */}
                {index === 0 && (
                  <div className="mb-6 flex justify-center mt-4">
                    <img 
                      src={favicon} 
                      alt="Slab! App Icon" 
                      className="w-32 h-32 rounded-lg"
                    />
                  </div>
                )}

                {/* Step Title */}
                <h2 className="text-4xl font-bold text-gray-800 mb-4 text-center mt-4">
                  {step.title}
                </h2>

                {/* Step Content */}
                <p className={`text-gray-600 leading-relaxed text-center ${step.showSlabMaker ? 'mb-0' : 'mb-6'}`}>
                  {step.content}
                </p>

                {/* Random Slab Display (only for "This is a Slab" step) */}
                {step.showSlab && (
                  <div className="flex flex-col items-center gap-4 pb-8">
                    <SlabComponent 
                      slab={randomSlab} 
                      size="medium"
                      className="shadow-lg"
                    />
                    <button
                      onClick={generateNewSlab}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <FiRefreshCw size={16} />
                      <span className="text-sm">Show another</span>
                    </button>
                  </div>
                )}

                {/* SlabMaker Display (only for "You can make slabs" step) */}
                {step.showSlabMaker && (
                  <div className="flex flex-col items-center w-full pb-8">
                    <div className="w-full max-w-md">
                      <SlabMaker 
                        onCreate={() => {}} // No-op for tutorial
                        colors={COLORS}
                        colorblindMode="none"
                        hideControls={true}
                      />
                    </div>
                  </div>
                )}

                {/* Example Slabs Display (only for "The Puzzles" step) */}
                {step.showExamples && (
                  <div className="flex flex-col items-center gap-4">
                    {isLoadingPuzzle ? (
                      <div className="text-gray-500">Loading examples...</div>
                    ) : firstPuzzle && firstPuzzle.shown_examples && firstPuzzle.shown_examples.length > 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-sm text-gray-600 text-center">
                          Here are some examples from the first puzzle:
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                          {firstPuzzle.shown_examples.slice(0, 3).map((example: any, index) => {
                            // Deserialize if needed
                            const isSerialized = example && typeof example === 'object' && 'grid' in example && 'colors' in example;
                            const deserializedExample = isSerialized ? deserializeSlab(example) : example;
                            const key = JSON.stringify(deserializedExample);
                            const evaluationResult = evaluationResults.get(key) || false;
                            
                            return (
                              <div key={index} className="flex flex-col items-center gap-2">
                                <div className="relative">
                                  <SlabComponent 
                                    slab={deserializedExample} 
                                    size="small"
                                    className="shadow-md"
                                  />
                                  {/* Evaluation annotation exactly like in SlabPuzzle.tsx */}
                                  {evaluationResult !== undefined && (
                                    <div 
                                      className="absolute"
                                      style={{
                                        top: '-4px',
                                        right: '-4px',
                                        color: '#000000',
                                        filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                                      }}
                                    >
                                      {evaluationResult ? (
                                        <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
                                      ) : (
                                        <FiX size={16} className="text-red-500" />
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {evaluationResult ? 'Passes the rule ⭐️' : 'Doesn\'t pass the rule'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No examples available</div>
                    )}
                  </div>
                )}

                {/* Guess Button Display (only for "How to Win" step) */}
                {step.showGuessButton && (
                  <div className="flex flex-col items-center gap-4 pb-8">
                    <div className="text-sm text-gray-600 text-center">
                      When you're ready to guess, use this button:
                    </div>
                    <button
                      className="px-6 py-4 rounded text-sm flex flex-col items-center justify-center h-20 bg-yellow-500 text-white shadow-lg"
                      disabled
                      title="Guess button (disabled in tutorial)"
                    >
                      <span className="text-sm font-medium">Guess</span>
                      <span className="text-xs">
                        3/3
                      </span>
                    </button>
                    <div className="text-xs text-gray-500 text-center max-w-xs">
                      3/3 remaining guesses
                    </div>
                  </div>
                )}

                {/* Randomizing Slab Display (only for "Have fun!" step) */}
                {index === steps.length - 1 && (
                  <div className="flex flex-col items-center gap-4 pb-8">
                    <SlabComponent 
                      slab={finalPanelSlab} 
                      size="medium"
                      className="shadow-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Section */}
      <div className="p-4 pt-0">
        {/* Progress Dots */}
        <div className="flex gap-2 justify-center mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Back Button */}
          <button
            onClick={currentStep === 0 ? onHome : handleBack}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg p-4 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FiArrowLeft size={20} />
            <span className="text-lg font-semibold">Back</span>
          </button>

          {/* Next/Play Button */}
          <button
            onClick={handleNext}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 transition-colors duration-200 shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-lg font-semibold">
              {currentStep === steps.length - 1 ? 'Play' : 'Next'}
            </span>
            <FiArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
