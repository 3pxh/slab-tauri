import React from 'react';
import { getAllDates } from '../lib/supabase';
import Instructions from './Instructions';
import favicon from '../assets/favicon.png';

interface LevelSelectProps {
  onSelect: (date: Date) => void;
  onCreatePuzzle: () => void;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LevelSelect: React.FC<LevelSelectProps> = ({ onSelect, onCreatePuzzle }) => {
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
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
          const dateSet = new Set(response.dates.map(dateStr => {
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
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

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const goPrevMonth = () => {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availableDates.has(dateStr);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
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
              {visibleMonth.toLocaleString(undefined, { month: 'long' })} {year}
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

      <Instructions />

      {!__HIDE_PUZZLE_CREATOR__ && (
        <div className="mt-4 text-center">
          <button
            onClick={onCreatePuzzle}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Create New Puzzle
          </button>
        </div>
      )}
    </div>
  );
};

export default LevelSelect;


