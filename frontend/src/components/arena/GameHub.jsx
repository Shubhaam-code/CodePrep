import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Bug, Coins } from 'lucide-react';

export default function GameHub({ onSelectGame }) {
  const games = [
    {
      id: 'royale',
      title: 'Code Royale',
      subtitle: '1v1 battle',
      description: 'Go head-to-head with another developer in a race to solve the same random challenge. First accepted submission wins.',
      icon: Swords,
      color: 'from-[#FF7A00] to-[#FFB800]',
      glow: 'shadow-[#FF7A00]/20 border-[#FF7A00]/20'
    },
    {
      id: 'bughunt',
      title: 'Bug Hunt',
      subtitle: 'Hidden Bug Challenge',
      description: 'A pre-filled implementation has a hidden bug. Scan, find, and patch the error before the clock runs out.',
      icon: Bug,
      color: 'from-[#FFB800] to-[#FFD700]',
      glow: 'shadow-[#FFB800]/20 border-[#FFB800]/20'
    },
    {
      id: 'auction',
      title: 'Code Auction',
      subtitle: 'Complexity Prediction Game',
      description: 'Analyze time/space complexities of 3 solutions, predict the optimal execution path, and bid points.',
      icon: Coins,
      color: 'from-[#FF5500] to-[#FF9900]',
      glow: 'shadow-[#FF5500]/20 border-[#FF5500]/20'
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-full px-4 py-1.5 text-[10px] font-extrabold text-[#FFB800] uppercase tracking-wider"
        >
          ⚡ Welcome to the Coding Arena
        </motion.div>
        <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
          Select Your <span className="bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700] bg-clip-text text-transparent">Challenge Mode</span>
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Prove your mastery in competitive coding. Race in real-time, patch hidden bugs, or auction solution complexities.
        </p>
      </div>

      {/* Grid of game cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {games.map((g, idx) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            whileHover={{ y: -8 }}
            className={`group bg-[#0D0D12] border ${g.glow} hover:border-[#FF7A00]/30 rounded-3xl p-6 flex flex-col justify-between h-96 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-lg`}
            onClick={() => onSelectGame(g.id)}
          >
            {/* Background Hover glow overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#FF7A00]/5 to-transparent pointer-events-none" />

            <div className="space-y-4">
              {/* Game Icon */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center text-black`}>
                <g.icon size={22} className="stroke-[2.5]" />
              </div>

              {/* Title & Sub */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#FFB800] uppercase font-black tracking-widest">{g.subtitle}</span>
                <h3 className="text-white font-extrabold text-xl group-hover:text-[#FFB800] transition-colors">{g.title}</h3>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-xs leading-relaxed">
                {g.description}
              </p>
            </div>

            {/* Play Button */}
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#FF7A00] group-hover:text-[#FFB800] transition-colors pt-4 border-t border-white/5 mt-auto">
              <span>Enter Lobby</span>
              <Swords size={12} className="group-hover:translate-x-1 transition-transform animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
