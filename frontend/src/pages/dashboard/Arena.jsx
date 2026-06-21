import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Swords } from 'lucide-react';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the game modes
const GameHub = lazy(() => import('../../components/arena/GameHub'));
const CodeRoyale = lazy(() => import('../../components/arena/CodeRoyale'));
const BugHunt = lazy(() => import('../../components/arena/BugHunt'));
const CodeAuction = lazy(() => import('../../components/arena/CodeAuction'));

export default function Arena() {
  const SIDEBAR_W = 224;
  const [activeGame, setActiveGame] = useState('hub'); // 'hub' | 'royale' | 'bughunt' | 'auction'

  const handleSelectGame = (gameId) => {
    setActiveGame(gameId);
  };

  const handleBackToHub = () => {
    setActiveGame('hub');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Top Navbar Header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-[#FF7A00]" />
            <h1 className="text-white font-bold text-lg">Coding Arena</h1>
          </div>
          <div className="flex items-center gap-2 bg-[#FF7A00]/10 border border-[#FF7A00]/25 rounded-xl px-3 py-1 text-xs text-[#FFB800] font-extrabold uppercase tracking-wider animate-pulse">
            <Swords size={12} /> Live Games
          </div>
        </div>

        {/* Dynamic Game Workspace */}
        <div className="p-6">
          <Suspense fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }>
            {activeGame === 'hub' && (
              <GameHub onSelectGame={handleSelectGame} />
            )}
            {activeGame === 'royale' && (
              <CodeRoyale onBack={handleBackToHub} />
            )}
            {activeGame === 'bughunt' && (
              <BugHunt onBack={handleBackToHub} />
            )}
            {activeGame === 'auction' && (
              <CodeAuction onBack={handleBackToHub} />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
