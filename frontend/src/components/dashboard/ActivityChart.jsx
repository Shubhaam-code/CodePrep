import { motion } from 'framer-motion';

const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function ActivityChart({ recentSolved = [] }) {
  // Compute real solved count per day of the week
  const data = [0, 0, 0, 0, 0, 0, 0];
  
  recentSolved.forEach(q => {
    if (!q.solvedAt) return;
    const date = new Date(q.solvedAt);
    const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const index = day === 0 ? 6 : day - 1; // Map to Mon=0 ... Sun=6
    data[index]++;
  });

  const totalThisWeek = data.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...data, 1); // Avoid division by zero

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-sm">Weekly Activity</h3>
          <p className="text-gray-600 text-xs mt-0.5">Questions solved this week</p>
        </div>
        <div className="text-right">
          <p className="text-[#FFD700] font-extrabold text-xl">{totalThisWeek}</p>
          <p className="text-gray-600 text-[10px]">total this week</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 h-32 mb-2">
        {data.map((val, i) => {
          const heightPct = (val / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-[#FFD700] bg-[#111115] border border-white/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                {val} solved
              </div>
              {/* Bar */}
              <div className="w-full flex-1 flex items-end rounded-t-sm overflow-hidden">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }}
                  className="w-full rounded-t-lg cursor-pointer"
                  style={{
                    background: val > 0 && val === Math.max(...data)
                      ? 'linear-gradient(180deg, #FFD700, #FF7A00)'
                      : 'linear-gradient(180deg, #FF7A0060, #FF7A0030)',
                    boxShadow: val > 0 && val === Math.max(...data) ? '0 -4px 20px rgba(255,215,0,0.4)' : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Day labels */}
      <div className="flex justify-between gap-2">
        {days.map(d => (
          <div key={d} className="flex-1 text-center text-[10px] text-gray-600 font-medium">{d}</div>
        ))}
      </div>
    </div>
  );
}
