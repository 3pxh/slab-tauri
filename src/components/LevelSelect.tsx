import React from 'react';
import { getAllDatesWithDifficulty, PuzzleDate } from '../lib/supabase';
import { isTodayUTC } from '../utils';
import AppHeader from './AppHeader';
import DifficultyIndicator from './DifficultyIndicator';
import Slab, { COLORS } from './Slab';
import ScrollButton from './ScrollButton';

interface LevelSelectProps {
  onSelect: (date: Date) => void;
  onTodayPuzzle: () => void;
  onHome: () => void;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LevelSelect: React.FC<LevelSelectProps> = ({ onSelect, onHome }) => {
  const [puzzles, setPuzzles] = React.useState<PuzzleDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = React.useState(true);
  const [showScrollDownButton, setShowScrollDownButton] = React.useState(false);
  const [showScrollUpButton, setShowScrollUpButton] = React.useState(false);

  // Fetch available puzzle dates with difficulty on component mount
  React.useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        setIsLoadingDates(true);
        const response = await getAllDatesWithDifficulty();
        if (response.success) {
          console.log('Puzzles data:', response.puzzles);
          // Reverse the order so earliest puzzle (#1) is at the top
          setPuzzles(response.puzzles.reverse());
        }
      } catch (error) {
        console.error('Failed to fetch available puzzles:', error);
      } finally {
        setIsLoadingDates(false);
      }
    };

    fetchPuzzles();
  }, []);

  // Scroll detection for showing/hiding the scroll-to-bottom button
  React.useEffect(() => {
    const handleScroll = () => {
      const puzzlesList = document.getElementById('puzzles-list');
      
      if (puzzlesList) {
        // Check scroll within the puzzles list container
        const scrollTop = puzzlesList.scrollTop;
        const scrollHeight = puzzlesList.scrollHeight;
        const clientHeight = puzzlesList.clientHeight;
        
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
        const isAtTop = scrollTop <= 10; // 10px threshold
        
        const shouldShowDown = !isAtBottom && puzzles.length > 0;
        const shouldShowUp = !isAtTop && puzzles.length > 0;
        
        console.log('Container scroll detection:', {
          scrollTop,
          scrollHeight,
          clientHeight,
          isAtBottom,
          isAtTop,
          puzzlesLength: puzzles.length,
          shouldShowDown,
          shouldShowUp
        });
        
        setShowScrollDownButton(shouldShowDown);
        setShowScrollUpButton(shouldShowUp);
      } else {
        // Fallback to window scroll detection
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        const isAtBottom = scrollTop + windowHeight >= documentHeight - 50;
        const isAtTop = scrollTop <= 50;
        
        const shouldShowDown = !isAtBottom && puzzles.length > 0;
        const shouldShowUp = !isAtTop && puzzles.length > 0;
        
        console.log('Window scroll detection:', {
          scrollTop,
          windowHeight,
          documentHeight,
          isAtBottom,
          isAtTop,
          puzzlesLength: puzzles.length,
          shouldShowDown,
          shouldShowUp
        });
        
        setShowScrollDownButton(shouldShowDown);
        setShowScrollUpButton(shouldShowUp);
      }
    };

    const puzzlesList = document.getElementById('puzzles-list');
    
    if (puzzlesList) {
      puzzlesList.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      if (puzzlesList) {
        puzzlesList.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [puzzles.length]);

  const scrollToBottom = () => {
    console.log('Scrolling to bottom...');
    
    // Target the specific scrollable puzzles list
    const puzzlesList = document.getElementById('puzzles-list');
    if (puzzlesList) {
      console.log('Found puzzles list, scrolling to bottom');
      puzzlesList.scrollTo({
        top: puzzlesList.scrollHeight,
        behavior: 'smooth'
      });
      return;
    }
    
    // Fallback: try window scroll
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    if (maxScroll > 0) {
      window.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    console.log('Scrolling to top...');
    
    // Target the specific scrollable puzzles list
    const puzzlesList = document.getElementById('puzzles-list');
    if (puzzlesList) {
      console.log('Found puzzles list, scrolling to top');
      puzzlesList.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }
    
    // Fallback: try window scroll
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const formatDateForDisplay = (dateString: string) => {
    // Handle different date formats from database
    let date: Date;
    
    // If the date string is already in ISO format or has time info, use as-is
    if (dateString.includes('T') || dateString.includes(' ')) {
      date = new Date(dateString);
    } else {
      // If it's just a date string like "2024-01-15", append time for UTC parsing
      date = new Date(dateString + 'T00:00:00Z');
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return {
        dayOfWeek: 'Invalid Date',
        fullDate: 'Invalid Date',
        date: new Date()
      };
    }
    
    const dayOfWeek = dayNames[date.getUTCDay()];
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    
    return {
      dayOfWeek,
      fullDate: `${month} ${day}, ${year}`,
      date: date
    };
  };

  const isToday = (dateString: string) => {
    let date: Date;
    
    if (dateString.includes('T') || dateString.includes(' ')) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString + 'T00:00:00Z');
    }
    
    if (isNaN(date.getTime())) {
      return false;
    }
    
    return isTodayUTC(date);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 h-screen flex flex-col">
      {/* App Header */}
      <AppHeader onBack={onHome} showBackButton={true} />
      
      {/* Loading State */}
        {isLoadingDates ? (
        <div className="flex items-center justify-center py-8 flex-1">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span>Loading puzzles...</span>
            </div>
          </div>
        ) : (
        <>
          {/* Puzzles List */}
          <div className="space-y-2 flex-1 overflow-y-auto" id="puzzles-list">
            {puzzles.map((puzzle, index) => {
              const { dayOfWeek, fullDate, date } = formatDateForDisplay(puzzle.publish_date);
              const isTodayPuzzle = isToday(puzzle.publish_date);
              // Calculate puzzle number (earliest puzzle = #1, most recent = highest number)
              // Since puzzles are now ordered chronologically (earliest first), 
              // the index + 1 gives us the correct numbering
              const puzzleNumber = index + 1;
              
              return (
                <button
                  key={puzzle.publish_date}
                  onClick={() => onSelect(date)}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    isTodayPuzzle
                      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Puzzle number */}
                      <div className={`text-lg font-bold ${isTodayPuzzle ? 'text-blue-700' : 'text-gray-500'}`}>
                        #{puzzleNumber}
                      </div>
                      
                      <div className="flex flex-col flex-1">
                        <div className={`font-semibold ${isTodayPuzzle ? 'text-blue-700' : 'text-gray-900'}`}>
                          {dayOfWeek}
                        </div>
                        <div className={`text-sm ${isTodayPuzzle ? 'text-blue-600' : 'text-gray-600'}`}>
                          {fullDate}
                        </div>
                        {/* Difficulty indicator under day of week */}
                        <div className="mt-1">
                          <DifficultyIndicator 
                            difficulty={puzzle.difficulty} 
                            size="small"
                            showTooltip={true}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Shown slabs */}
                    <div className="flex items-center gap-2 ml-4">
                      {puzzle.shown_examples && puzzle.shown_examples.length > 0 ? (
                        puzzle.shown_examples.slice(0, 2).map((slabData, index) => (
                          <div key={index} className="w-8 h-8 flex-shrink-0">
                            <Slab 
                              slab={slabData} 
                              size="small" 
                              className="w-full h-full"
                              colors={COLORS}
                              colorblindMode="none"
                              getColorblindOverlay={() => null}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          ?
                        </div>
                      )}
                    </div>
                    
                    {/* Today badge */}
                    {isTodayPuzzle && (
                      <div className="ml-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          Today
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </>
      )}

      {/* Scroll Buttons */}
      <ScrollButton
        onClick={scrollToTop}
        isVisible={showScrollUpButton}
        direction="up"
        title="Scroll to top"
        ariaLabel="Scroll to top of puzzle list"
      />
      <ScrollButton
        onClick={scrollToBottom}
        isVisible={showScrollDownButton}
        direction="down"
        title="Scroll to bottom"
        ariaLabel="Scroll to bottom of puzzle list"
      />
    </div>
  );
};

export default LevelSelect;


