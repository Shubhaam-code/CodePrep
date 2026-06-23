import { motion } from 'framer-motion';
import { FaCode as Code2, FaFire as Flame, FaBookmark as Bookmark, FaCalendar as Calendar } from 'react-icons/fa';

const container = { hidden:{}, show:{ transition:{ staggerChildren:0.1 } } };
const item = { hidden:{ opacity:0, y:20 }, show:{ opacity:1, y:0, transition:{ duration:0.5 } } };

export default function StatsCards({ totalSolved = 0, streak = 0, totalBookmarked = 0, lastActive = 'Never' }) {
  const stats = [
    { icon: Code2,    label: 'Questions Solved',   value: totalSolved,      sub: 'All-time solved',     color: '#FF7A00', glow: 'rgba(255,122,0,0.15)' },
    { icon: Flame,    label: 'Current Streak 🔥',  value: streak,           sub: 'Consecutive days',     color: '#FFB800', glow: 'rgba(255,184,0,0.15)' },
    { icon: Bookmark, label: 'Starred Bookmarks',  value: totalBookmarked,  sub: 'Saved questions',     color: '#FFD700', glow: 'rgba(255,215,0,0.15)' },
    { icon: Calendar, label: 'Last Active Date',   value: lastActive,       sub: 'Last activity timestamp', color: '#22C55E', glow: 'rgba(34,197,94,0.15)' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <motion.div key={s.label} variants={item} whileHover={{ y:-2, scale:1.02 }}
          transition={{ type:'spring', stiffness:300 }}
          className="relative bg-white/[0.03] border border-white/8 rounded-2xl p-5 overflow-hidden group cursor-default">
          {/* Glow bg */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
            style={{ background:`radial-gradient(circle at top left, ${s.glow}, transparent 70%)` }} />
          {/* Top line */}
          <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
            style={{ background:`linear-gradient(90deg, transparent, ${s.color}60, transparent)` }} />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background:`${s.color}18`, border:`1px solid ${s.color}30` }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1" style={{ textShadow:`0 0 30px ${s.color}40` }}>
              {s.value}
            </div>
            <div className="text-gray-400 text-xs font-medium mb-1">{s.label}</div>
            <div className="text-[10px] text-gray-600">{s.sub}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
