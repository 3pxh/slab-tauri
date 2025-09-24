import React from 'react';

interface LevelSelectProps {
  onSelect: (date: Date) => void;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LevelSelect: React.FC<LevelSelectProps> = ({ onSelect }) => {
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Dates before this are grayed out and not selectable
  const cutoffDate = new Date(2025, 8, 24); // September is month 8 (0-indexed)

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

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
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

      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-600 mb-2">
        {dayNames.map((dn) => (
          <div key={dn} className="py-1">
            {dn}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const isDisabled = !date || (date < cutoffDate);
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
  );
};

export default LevelSelect;


