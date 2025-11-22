import React from 'react';
import { FiAward } from 'react-icons/fi';
import { getAllDatesWithDifficulty, PuzzleDate } from '../lib/supabase';
import { isTodayUTC, isTodayOrBefore } from '../utils';
import AppHeader from './AppHeader';
import DifficultyIndicator from './DifficultyIndicator';
import Slab, { COLORS, deserializeSlab } from './Slab';
import ScrollButton from './ScrollButton';
import { useNavigation } from '../utils/navigation';
import { puzzleProgressService } from '../lib/puzzleProgress';
import { PuzzleProgress } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface LevelSelectProps {}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LevelSelect: React.FC<LevelSelectProps> = () => {
  const [puzzles, setPuzzles] = React.useState<PuzzleDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = React.useState(true);
  const [showScrollDownButton, setShowScrollDownButton] = React.useState(false);
  const [showScrollUpButton, setShowScrollUpButton] = React.useState(false);
  const [puzzleProgress, setPuzzleProgress] = React.useState<Map<string, PuzzleProgress>>(new Map());
  const { goToPuzzle, goHome } = useNavigation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Fetch available puzzle dates with difficulty on component mount
  React.useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        setIsLoadingDates(true);
        const response = await getAllDatesWithDifficulty();
        if (response.success) {
          // Filter out puzzles after today, keeping newest puzzles at the top
          const filteredPuzzles = response.puzzles.filter(puzzle => 
            isTodayOrBefore(puzzle.publish_date)
          );
          setPuzzles(filteredPuzzles);
        }
      } catch (error) {
        console.error('Failed to fetch available puzzles:', error);
      } finally {
        setIsLoadingDates(false);
      }
    };

    fetchPuzzles();
  }, []);

  // Fetch puzzle progress for all puzzles (only after auth is ready)
  React.useEffect(() => {
    // Wait for auth to finish loading before fetching progress
    if (isAuthLoading) {
      return;
    }

    const fetchProgress = async () => {
      try {
        const allProgress = await puzzleProgressService.getAllProgress();
        // Create a map of puzzle_id to progress (include all progress, not just those with trophies)
        const progressMap = new Map<string, PuzzleProgress>();
        allProgress.forEach(progress => {
          progressMap.set(progress.puzzle_id, progress);
        });
        setPuzzleProgress(progressMap);
      } catch (error) {
        console.error('Failed to fetch puzzle progress:', error);
        // Don't fail silently, but continue without progress data
      }
    };

    // Only fetch if authenticated (anonymous users are also authenticated)
    if (isAuthenticated) {
      fetchProgress();
    }
  }, [isAuthenticated, isAuthLoading]);

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
    // Target the specific scrollable puzzles list
    const puzzlesList = document.getElementById('puzzles-list');
    if (puzzlesList) {
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
    // Target the specific scrollable puzzles list
    const puzzlesList = document.getElementById('puzzles-list');
    if (puzzlesList) {
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
      <AppHeader onBack={goHome} showBackButton={true} />
      
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
              const { fullDate, date } = formatDateForDisplay(puzzle.publish_date);
              const isTodayPuzzle = isToday(puzzle.publish_date);
              // Calculate puzzle number (newest puzzle = highest number, earliest puzzle = #1)
              // Since puzzles are ordered with newest first, we calculate from the end
              const puzzleNumber = puzzles.length - index;
              
              return (
                <button
                  key={puzzle.publish_date}
                  onClick={() => goToPuzzle(date)}
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
                        <div className={`font-semibold flex items-center gap-2 ${isTodayPuzzle ? 'text-blue-700' : 'text-gray-900'}`}>
                          <span>{puzzle.name}</span>
                          {(() => {
                            const progress = puzzleProgress.get(puzzle.id);
                            const trophies = progress?.trophies || 0;
                            return trophies > 0 ? (
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: trophies }, (_, i) => (
                                  <FiAward key={i} className="text-yellow-500 fill-yellow-300 flex-shrink-0" size={16} />
                                ))}
                              </div>
                            ) : null;
                          })()}
                          {(() => {
                            const progress = puzzleProgress.get(puzzle.id);
                            const totalCorrect = progress?.total_correct;
                            const attempts = progress?.attempts || 0;
                            const maxPossible = attempts > 0 ? 5 * attempts : 0;
                            return totalCorrect !== null && totalCorrect !== undefined && maxPossible > 0 ? (
                              <span className="text-sm font-normal text-gray-600">
                                {totalCorrect}/{maxPossible}
                              </span>
                            ) : null;
                          })()}
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
                        puzzle.shown_examples.slice(0, 2).map((slabData: any, index) => {
                          // Deserialize if needed
                          const isSerialized = slabData && typeof slabData === 'object' && 'grid' in slabData && 'colors' in slabData;
                          const deserializedSlab = isSerialized ? deserializeSlab(slabData) : slabData;
                          return (
                          <div key={index} className="w-8 h-8 flex-shrink-0">
                            <Slab 
                              slab={deserializedSlab} 
                              size="small" 
                              className="w-full h-full"
                              colors={COLORS}
                              colorblindMode="none"
                              getColorblindOverlay={() => null}
                            />
                          </div>
                          );
                        })
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


