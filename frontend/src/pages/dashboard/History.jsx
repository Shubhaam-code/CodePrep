import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History as HistoryIcon, Search, Calendar, Trophy,
  ArrowRight, Swords, CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';


const SIDEBAR_W = 224;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function diffBadge(d = '') {
  const dl = d.toLowerCase();
  if (dl === 'easy')   return { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80', border: 'rgba(34,197,94,0.25)' };
  if (dl === 'hard')   return { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' };
  return                      { bg: 'rgba(234,179,8,0.1)',   color: '#fbbf24', border: 'rgba(234,179,8,0.25)' };
}

export default function History() {
  const navigate = useNavigate();

  // Search & filter state
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeTab, setActiveTab]       = useState('All'); // 'All' | 'DSA Practice' | 'GV Challenge'
  const [timeFilter, setTimeFilter]     = useState('All');
  const [selectedArena, setSelectedArena] = useState(null);

  // 1. Fetch Arena history
  const { data: arenaHistory = [], isLoading: loadingArena, isError: errorArena, error: errArena } = useQuery({
    queryKey: ['arenaHistoryUnified'],
    queryFn: async () => {
      const res = await apiClient.get('/api/arena/history');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // 2. Fetch GV Challenge progress
  const { data: gvProgress, isLoading: loadingGV, isError: errorGV } = useQuery({
    queryKey: ['gv-progress-history'],
    queryFn: async () => {
      const res = await apiClient.get('/api/gvchallenge/progress');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const isLoading = loadingArena || loadingGV;
  const isError   = errorArena;

  const capitalize = (str) => {
    if (!str) return '';
    return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDateShort = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // ── Normalise Arena records ──────────────────────────────────────────────
  const normalizedArena = arenaHistory.map(match => {
    const isWin = match.result === 'win';
    return {
      id: match._id,
      historyType: 'DSA Practice',
      title: match.questionTitle || 'Coding Duel',
      opponentName: match.opponentName || 'Unknown Rival',
      result: isWin ? 'Win' : 'Loss',
      ratingChange: isWin ? '+20 Arena Points' : '-10 Arena Points',
      date: new Date(match.date || match.createdAt),
      runtime: match.runtime || 0,
      original: match,
    };
  });

  // ── GV Challenge records ─────────────────────────────────────────────────
  const gvCompletions = (gvProgress?.completedDays || []).map(c => ({
    id: `gv-${c.dayNumber}`,
    historyType: 'GV Challenge',
    dayNumber: c.dayNumber,
    questionTitle: c.questionTitle,
    difficulty: c.difficulty,
    language: c.language,
    topic: c.topic,
    linkedinPosted: c.linkedinPosted,
    date: new Date(c.completedAt),
  }));

  // ── Merge + filter ───────────────────────────────────────────────────────
  const mergedHistory = [...normalizedArena, ...gvCompletions].sort((a, b) => b.date - a.date);

  const filteredHistory = mergedHistory.filter(item => {
    if (activeTab === 'DSA Practice' && item.historyType !== 'DSA Practice') return false;
    if (activeTab === 'GV Challenge'  && item.historyType !== 'GV Challenge')  return false;

    if (timeFilter !== 'All') {
      const diffDays = Math.ceil(Math.abs(Date.now() - item.date) / 86400000);
      if (timeFilter === 'Last 7 Days'  && diffDays > 7)  return false;
      if (timeFilter === 'Last 30 Days' && diffDays > 30) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const t = (item.title || item.questionTitle || '').toLowerCase();
      return t.includes(q);
    }

    return true;
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalArena = arenaHistory.length;
  const winCount   = arenaHistory.filter(m => m.result === 'win').length;
  const winRate    = totalArena > 0 ? Math.round((winCount / totalArena) * 100) : 0;
  const gvTotal    = gvProgress?.totalCompleted || 0;
  const gvStreak   = gvProgress?.currentStreak || 0;
  const gvPosts    = gvProgress?.linkedinPosted || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
        <ErrorMessage message={errArena?.message || 'Failed to load history.'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-12" style={{ marginLeft: SIDEBAR_W }}>

        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-white font-bold text-lg flex items-center gap-2 select-none">
              <HistoryIcon size={18} className="text-[#FF7A00]" />
              Activity History
            </h1>
            <p className="text-gray-500 text-xs select-none">Your DSA battles and GV Challenge completions</p>
          </div>

          {/* Tab filter */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl shrink-0 select-none">
            {['All', 'DSA Practice', 'GV Challenge'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* GV CHALLENGE STATS CARD */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-5"
            style={{
              background: 'linear-gradient(135deg, var(--bg-card, #0F0F1A), var(--bg-hover, #141428))',
              border: '1px solid var(--orange-dim, rgba(249,115,22,0.12))',
              borderRadius: '12px',
            }}
          >
            <p className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <Trophy size={15} className="text-[#FF7A00]" />
              🏆 G. Viswanathan Challenge
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Days Completed', value: gvTotal, color: '#FF7A00' },
                { label: 'Current Streak', value: `${gvStreak} 🔥`, color: '#FF7A00' },
                { label: 'Posts Made',     value: gvPosts,  color: '#3B82F6' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* STATS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">GV Days</span>
              <strong className="text-2xl text-[#FF7A00] mt-1 block font-mono">{gvTotal}</strong>
            </div>
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">GV Streak</span>
              <strong className="text-2xl text-amber-400 mt-1 block font-mono">{gvStreak} 🔥</strong>
            </div>
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">Arena Battles</span>
              <strong className="text-2xl text-white mt-1 block font-mono">{totalArena}</strong>
            </div>
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">Arena Win Rate</span>
              <strong className="text-2xl text-green-400 mt-1 block font-mono">{winRate}%</strong>
            </div>
          </div>

          {/* SEARCH + DATE FILTER */}
          <div className="bg-[#0D0D12] border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg select-none">
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 w-full md:max-w-xs">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full font-sans"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <span>Date:</span>
              <div className="flex bg-black border border-white/5 p-0.5 rounded-lg">
                {['All', 'Last 7 Days', 'Last 30 Days'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setTimeFilter(opt)}
                    className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${
                      timeFilter === opt ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'
                    }`}
                  >
                    {opt.replace('Last ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HISTORY CARDS */}
          {filteredHistory.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-20 bg-[#0D0D12]/20 border border-dashed border-white/10 p-8 rounded-3xl space-y-5">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-gray-500">
                <HistoryIcon size={28} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-white font-bold text-base">No History Yet</h3>
                <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto">
                  No activity matches your current filters.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/gvchallenge')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-1"
              >
                Start GV Challenge <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredHistory.map((item, idx) => {
                  const isGV     = item.historyType === 'GV Challenge';
                  const isArena  = item.historyType === 'DSA Practice';

                  if (isGV) {
                    const dc = diffBadge(item.difficulty);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                        className="relative overflow-hidden flex flex-col justify-between"
                        style={{
                          background: 'var(--bg-card, #0F0F1A)',
                          border: '1px solid var(--border, rgba(255,255,255,0.06))',
                          borderLeft: '3px solid var(--orange, #F97316)',
                          borderRadius: '12px',
                          padding: '16px',
                        }}
                      >
                        {/* Top row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Trophy size={13} className="text-[#FF7A00]" />
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-lg border"
                              style={{ background: 'var(--orange-dim)', color: 'var(--orange)', borderColor: 'rgba(249,115,22,0.3)' }}
                            >
                              GV Challenge
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">{formatDateShort(item.date)}</span>
                        </div>

                        {/* Day number */}
                        <p
                          className="font-bold text-lg mb-1"
                          style={{ color: 'var(--orange)', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          Day {item.dayNumber}
                        </p>

                        {/* Question title */}
                        <p className="font-semibold text-sm mb-2 truncate" style={{ color: 'var(--text-1)' }}>
                          {item.questionTitle}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.difficulty && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                              style={{ background: dc.bg, color: dc.color, borderColor: dc.border }}
                            >
                              {item.difficulty}
                            </span>
                          )}
                          {item.language && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: 'var(--bg-hover)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                            >
                              {item.language}
                            </span>
                          )}
                          {item.topic && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: 'var(--bg-hover)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                            >
                              {item.topic}
                            </span>
                          )}
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          {item.linkedinPosted ? (
                            <span className="text-[11px] font-semibold text-green-400 flex items-center gap-1">
                              <CheckCircle size={11} /> ✅ LinkedIn Posted
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                              📝 Solved
                            </span>
                          )}
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {timeAgo(item.date)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  }

                  // Arena card
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                      className="bg-[#0D0D12]/80 border border-white/5 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group shadow-lg"
                      style={{ minHeight: '160px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/0 to-transparent group-hover:via-[#FF7A00]/25 transition-all" />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#FF7A00] bg-[#FF7A00]/10 border border-[#FF7A00]/20 px-2 py-0.5 rounded-lg font-bold">
                            Arena Battle
                          </span>
                          <span className="text-gray-500 font-mono flex items-center gap-1">
                            <Calendar size={10} /> {formatDateShort(item.date)}
                          </span>
                        </div>

                        <h3 className="text-white font-extrabold text-sm group-hover:text-[#FFB800] transition-colors truncate">
                          {item.title}
                        </h3>

                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-gray-400">
                            Rival: <strong className="text-white">{item.opponentName}</strong>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono">
                            <span className={`font-bold ${item.result === 'Win' ? 'text-green-400' : 'text-red-400'}`}>
                              {item.result === 'Win' ? '🏆 Victory' : '💀 Defeated'}
                            </span>
                            <span className="text-[#FFB800] font-bold">{item.ratingChange}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 mt-auto flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{timeAgo(item.date)}</span>
                        <button
                          onClick={() => setSelectedArena(item.original)}
                          className="cursor-pointer text-xs font-bold text-[#FF7A00] group-hover:text-white transition-colors flex items-center gap-1"
                        >
                          View Match <Swords size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Arena detail modal */}
      <AnimatePresence>
        {selectedArena && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-[#0D0D12] border border-white/5 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-14 h-14 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto text-[#FF7A00]">
                <Swords size={24} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-white font-black text-xl">1v1 Arena Duel</h3>
                <p className="text-gray-500 text-xs">Match details</p>
              </div>

              <div className="bg-black/50 border border-white/5 p-4 rounded-2xl text-left text-xs font-mono space-y-2.5 max-w-xs mx-auto">
                <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                  <span className="text-gray-500">Challenge:</span>
                  <span className="text-white font-bold max-w-[150px] truncate">{selectedArena.questionTitle}</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                  <span className="text-gray-500">Opponent:</span>
                  <span className="text-white font-bold">{selectedArena.opponentName}</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                  <span className="text-gray-500">Result:</span>
                  <span className={`font-bold ${selectedArena.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedArena.result === 'win' ? '🏆 Victory' : '💀 Defeat'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                  <span className="text-gray-500">Runtime:</span>
                  <span className="text-white font-bold">
                    {selectedArena.result === 'win' ? `${selectedArena.runtime} ms` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-white font-bold">{new Date(selectedArena.date || selectedArena.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedArena(null)}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
