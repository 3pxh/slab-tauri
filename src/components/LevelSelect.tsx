import React from 'react';
import { getAllDates } from '../lib/supabase';
import { getStandardizedDateString, isTodayUTC } from '../utils';
import { FiPlay } from 'react-icons/fi';
import AppHeader from './AppHeader';

interface LevelSelectProps {
  onSelect: (date: Date) => void;
  onTodayPuzzle: () => void;
  onHome: () => void;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LevelSelect: React.FC<LevelSelectProps> = ({ onSelect, onTodayPuzzle, onHome }) => {
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });

  const [availableDates, setAvailableDates] = React.useState<Set<string>>(new Set());
  const [isLoadingDates, setIsLoadingDates] = React.useState(true);

  // Fetch available puzzle dates on component mount
  React.useEffect(() => {
    const fetchDates = async () => {
      try {
        setIsLoadingDates(true);
        const response = await getAllDates();
        if (response.success) {
          // Convert date strings to YYYY-MM-DD format for consistent comparison
          // Use UTC to ensure all users see the same puzzles regardless of timezone
          const dateSet = new Set(response.dates.map(dateStr => {
            return getStandardizedDateString(dateStr);
          }));
          setAvailableDates(dateSet);
        }
      } catch (error) {
        console.error('Failed to fetch available dates:', error);
      } finally {
        setIsLoadingDates(false);
      }
    };

    fetchDates();
  }, []);

  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const startDayOfWeek = firstDayOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(Date.UTC(year, month, d)));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const goPrevMonth = () => {
    setVisibleMonth(prev => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)));
  };
  const goNextMonth = () => {
    setVisibleMonth(prev => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)));
  };

  const isToday = (date: Date) => {
    return isTodayUTC(date);
  };

  const isDateAvailable = (date: Date) => {
    // Use UTC methods to ensure consistent date comparison
    // This ensures all users see the same puzzles regardless of their timezone
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return availableDates.has(dateStr);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader onBack={onHome} showBackButton={true} />
      
      <div className="mb-4">
        {isLoadingDates ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span>Loading available dates...</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={goPrevMonth}>
              ←
            </button>
            <div className="font-semibold">
              {visibleMonth.toLocaleString(undefined, { month: 'long', timeZone: 'UTC' })} {year}
            </div>
            <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={goNextMonth}>
              →
            </button>
          </div>
        )}
      </div>

      {!isLoadingDates && (
        <div className="mb-4">
          <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-600 mb-2">
            {dayNames.map((dn) => (
              <div key={dn} className="py-1">
                {dn}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date, idx) => {
              const isDisabled = !date || !isDateAvailable(date);
              const classBase = "aspect-square rounded flex items-center justify-center border ";
              const classEnabled = date
                ? "hover:bg-gray-100 cursor-pointer " + (isToday(date) ? "border-blue-500" : "border-gray-200")
                : "bg-transparent cursor-default border-transparent";
              const classDisabled = date
                ? "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200"
                : "bg-transparent cursor-default border-transparent";
              
              return (
                <button
                  key={idx}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled && date) onSelect(date);
                  }}
                  className={classBase + (isDisabled ? classDisabled : classEnabled)}
                  title={date ? date.toDateString() : ''}
                >
                  {date ? date.getDate() : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Puzzle Button */}
      <div className="mt-6">
        <button
          onClick={onTodayPuzzle}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 transition-colors duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-3">
            <FiPlay size={20} />
            <span className="font-semibold">Today's Puzzle</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default LevelSelect;


