import React from 'react';

export default function StreakCalendar({ submissions = [] }) {
  // Generate last 30 days descending to today
  const days = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  // Normalize passed submission dates to YYYY-MM-DD format
  const normalizedSolves = submissions
    .filter(sub => sub.status === 'passed')
    .map(sub => {
      const d = new Date(sub.submittedAt || sub.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dVal = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dVal}`;

    const formattedLabel = date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });

    const isSolved = normalizedSolves.includes(dateStr);
    days.push({
      dateStr,
      label: formattedLabel,
      isSolved
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
        <span>Activity Calendar (Last 30 Days)</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-white/5 border border-white/10" />
            Not Solved
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#FF7A00]" />
            Solved
          </span>
        </span>
      </div>

      <div className="grid grid-cols-10 gap-2 sm:gap-2.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
        {days.map((day, idx) => (
          <div 
            key={day.dateStr}
            className="group relative flex flex-col items-center animate-fade-in"
          >
            {/* Calendar Square */}
            <div 
              className={`w-full aspect-square rounded-lg border transition-all ${
                day.isSolved 
                  ? 'bg-[#FF7A00] border-[#FFB800]/25 shadow-sm shadow-[#FF7A00]/20' 
                  : 'bg-[#0B0B0F] border-white/5 hover:border-white/15'
              }`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#111115] border border-white/10 text-[9px] font-bold text-white px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none">
              {day.isSolved ? `Solved on ${day.label}` : `Not solved on ${day.label}`}
            </div>
            
            {/* Date label under columns */}
            {(idx === 0 || idx === 29 || idx === 15) && (
              <span className="text-[8px] text-gray-600 font-bold mt-1 uppercase select-none">
                {day.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
