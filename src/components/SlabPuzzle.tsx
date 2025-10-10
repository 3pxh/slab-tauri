import React from 'react';
import { FiArrowLeft, FiStar, FiMonitor } from 'react-icons/fi';
import { Puzzle } from '../lib/supabase';
import Slab, { SlabData, areSlabsEqual, COLORS } from './Slab';
import { deepCopy } from '../utils';
import SlabMaker from './SlabMaker';
import SlabList from './SlabList';
import GuessPanel, { GuessResult } from './GuessPanel';


type SlabPuzzleProps = {
  onHome: () => void;
  puzzle: Puzzle;
  slab: SlabData;
};

const SlabPuzzle: React.FC<SlabPuzzleProps> = ({ onHome, puzzle }) => {
  const [allSlabs, setAllSlabs] = React.useState<SlabData[]>([]);
  const [showGuessOverlay, setShowGuessOverlay] = React.useState(false);
  const [remainingGuesses, setRemainingGuesses] = React.useState(3);
  const [hasWon, setHasWon] = React.useState(false);
  const [pendingGuessedSlabs, setPendingGuessedSlabs] = React.useState<SlabData[]>([]);
  const [isInGuessSession, setIsInGuessSession] = React.useState(false);
  const [flashGuessButton, setFlashGuessButton] = React.useState(false);
  const [selectedSlabForMaker, setSelectedSlabForMaker] = React.useState<SlabData | null>(null);
  const [isGrayscale, setIsGrayscale] = React.useState(false);

  // Load shown examples into state when component mounts
  React.useEffect(() => {
    if (puzzle.shown_examples && puzzle.shown_examples.length > 0) {
      const deserializedExamples = puzzle.shown_examples;
      setAllSlabs(deserializedExamples);
    }
  }, [puzzle.shown_examples]);

  const handleSlabCreate = (newSlab: SlabData) => {
    // If we're in a guess session, flash the guess button instead of creating a slab
    if (isInGuessSession) {
      setFlashGuessButton(true);
      setTimeout(() => setFlashGuessButton(false), 1000); // Flash for 1 second
      return;
    }
    
    // Deep clone the slab to prevent reference sharing with SlabMaker
    const clonedSlab: SlabData = deepCopy(newSlab);
    
    setAllSlabs(prev => {
      // Remove any existing slabs that are identical to the new one
      const filteredSlabs = prev.filter(existingSlab => !areSlabsEqual(clonedSlab, existingSlab));
      // Add the new slab at the beginning
      return [clonedSlab, ...filteredSlabs];
    });
    
    // Clear the selected slab after creating
    setSelectedSlabForMaker(null);
  };

  const handleSlabClick = (clickedSlab: SlabData) => {
    // Deep clone the slab to prevent reference sharing
    const clonedSlab: SlabData = deepCopy(clickedSlab);
    
    setSelectedSlabForMaker(clonedSlab);
  };

  const handleShuffle = () => {
    setAllSlabs(prev => {
      const shuffled = [...prev];
      // Fisher-Yates shuffle algorithm
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const handleSlabsReorder = (newSlabs: SlabData[]) => {
    setAllSlabs(newSlabs);
  };

  const handleSort = () => {
    setAllSlabs(prev => {
      const sorted = [...prev].sort((a, b) => {
        const aResult = evaluateSlab(a);
        const bResult = evaluateSlab(b);
        // Black (true) comes first, then white (false)
        if (aResult && !bResult) return -1;
        if (!aResult && bResult) return 1;
        return 0;
      });
      return sorted;
    });
  };



  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  };

  // Grayscale color palette - distinct steps from light to dark
  const GRAYSCALE_COLORS = [
    '#f5f5f5', // Very light gray
    '#e0e0e0', // Light gray
    '#bdbdbd', // Medium light gray
    '#9e9e9e', // Medium gray (matches original gray)
    '#757575', // Medium dark gray
    '#616161', // Dark gray
    '#424242', // Very dark gray
  ];

  // Get the current color palette (grayscale or color)
  const getCurrentColors = (): string[] => {
    if (isGrayscale) {
      return GRAYSCALE_COLORS;
    }
    return COLORS;
  };

  const handleGrayscaleToggle = () => {
    setIsGrayscale(prev => !prev);
  };

  const evaluateSlab = (slab: SlabData): boolean => {
    if (!puzzle.evaluate_fn.trim()) {
      return false;
    }

    try {
      // Create the evaluation function
      const evalFunction = new Function('slab', puzzle.evaluate_fn);
      return evalFunction(slab);
    } catch (error) {
      console.error('Error evaluating slab:', error);
      return false;
    }
  };

  // Get hidden examples that are not already in the current slabs list
  const getFilteredHiddenExamples = (): SlabData[] => {
    if (!puzzle.hidden_examples || puzzle.hidden_examples.length === 0) {
      return [];
    }

    const hiddenSlabs = puzzle.hidden_examples;
    
    // Filter out hidden examples that are already in allSlabs
    const filteredHidden = hiddenSlabs.filter(hiddenSlab => 
      !allSlabs.some(existingSlab => areSlabsEqual(hiddenSlab, existingSlab))
    );

    // Return the first 5 filtered hidden examples
    return filteredHidden.slice(0, 5);
  };

  // Get slabs to display in the guess overlay
  const getSlabsForOverlay = (): SlabData[] => {
    // If we have pending guessed slabs (after submission), show those
    if (pendingGuessedSlabs.length > 0) {
      return pendingGuessedSlabs;
    }
    
    // Otherwise, show filtered hidden examples
    return getFilteredHiddenExamples();
  };

  const handleGuessClick = () => {
    // Don't allow guessing if no attempts remaining
    if (remainingGuesses <= 0) {
      return;
    }
    
    setShowGuessOverlay(true);
    
    // Only start a new guess session if we're not already in one
    if (!isInGuessSession) {
      setIsInGuessSession(true);
      // Reset pending guessed slabs when starting a new guess session
      setPendingGuessedSlabs([]);
    }
  };

  const handleCloseOverlay = () => {
    setShowGuessOverlay(false);
    setIsInGuessSession(false);
    
    // Add pending guessed slabs to the main list
    if (pendingGuessedSlabs.length > 0) {
      setAllSlabs(prev => [...pendingGuessedSlabs, ...prev]);
      setPendingGuessedSlabs([]);
    }
  };

  const handleGuessSubmit = (results: GuessResult[]) => {
    const filteredHidden = getFilteredHiddenExamples();
    let allCorrect = true;
    let hasAnyGuess = false;

    results.forEach((result) => {
      if (result.index < filteredHidden.length) {
        hasAnyGuess = true;
        
        if (!result.isCorrect) {
          allCorrect = false;
        }
      }
    });

    // Only process if there are actual guesses made
    if (hasAnyGuess) {
      // Decrement remaining guesses
      setRemainingGuesses(prev => Math.max(0, prev - 1));
      
      // Store guessed slabs in pending state (will be added to main list when overlay closes)
      const guessedSlabs = results
        .filter(result => result.index < filteredHidden.length)
        .map(result => filteredHidden[result.index]);
      setPendingGuessedSlabs(guessedSlabs);
      
      // Check if player won (all guesses correct)
      if (allCorrect) {
        setHasWon(true);
      }
    }

    setIsInGuessSession(false); // Reset guess session when guesses are submitted
  };

  // Get ground truth for the slabs in the overlay
  const getGroundTruth = (): boolean[] => {
    return getSlabsForOverlay().map(slab => evaluateSlab(slab));
  };

  return (
    <div className="w-full">
      {/* Puzzle Information */}
      <div className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            className="px-2 py-1 rounded text-sm hover:bg-gray-200"
            onClick={onHome}
            title="Back to levels"
            aria-label="Go back"
          >
            <FiArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {puzzle.name}
            {hasWon && (
              <FiStar className="text-yellow-500" size={20} />
            )}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {formatDate(puzzle.publish_date)}
          </div>
          <button
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
            onClick={handleGrayscaleToggle}
            title={isGrayscale ? "Switch to color mode" : "Switch to grayscale mode"}
            aria-label={isGrayscale ? "Switch to color mode" : "Switch to grayscale mode"}
          >
            <FiMonitor 
              size={20} 
              className={isGrayscale ? "text-gray-500" : "text-blue-500"} 
            />
          </button>
        </div>
      </div>
      
      <SlabMaker 
        onCreate={handleSlabCreate} 
        onGuess={handleGuessClick}
        guessCount={remainingGuesses}
        maxGuesses={3}
        hasWon={hasWon}
        flashGuessButton={flashGuessButton}
        isInGuessSession={isInGuessSession}
        initialSlab={selectedSlabForMaker || undefined}
        onShuffle={handleShuffle}
        onSort={handleSort}
        colors={getCurrentColors()}
      />

      {/* All Slabs */}
      <SlabList
        slabs={allSlabs}
        onSlabClick={handleSlabClick}
        onSlabsReorder={handleSlabsReorder}
        evaluateSlab={evaluateSlab}
        colors={getCurrentColors()}
      />

      {/* Guess Panel */}
      <GuessPanel
        isOpen={showGuessOverlay}
        onClose={handleCloseOverlay}
        remainingGuesses={remainingGuesses}
        maxGuesses={3}
        onGuessSubmit={handleGuessSubmit}
        groundTruth={getGroundTruth()}
        emptyMessage="No hidden examples available or all have been revealed."
      >
        {getSlabsForOverlay().map((slab, index) => (
          <Slab 
            key={index}
            slab={slab} 
            size="small" 
            className="w-full h-full" 
            colors={getCurrentColors()} 
          />
        ))}
      </GuessPanel>
    </div>
  );
};

export default SlabPuzzle;
