import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaClock as HistoryIcon, FaSearch as Search
  ,FaArrowRight as ArrowRight
} from 'react-icons/fa';
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
  const [timeFilter, setTimeFilter]     = useState('All');

  // Fetch GV Challenge progress
  const { data: gvProgress, isLoading: loadingGV, isError: errorGV, error: errGV } = useQuery({
    queryKey: ['gv-progress-history'],
    queryFn: async () => {
      const res = await apiClient.get('/api/gvchallenge/progress');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const isLoading = loadingGV;
  const isError   = errorGV;

  const formatDateShort = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

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

  // ── Filter ───────────────────────────────────────────────────────
  const filteredHistory = gvCompletions
    .sort((a, b) => b.date - a.date)
    .filter(item => {
      if (timeFilter !== 'All') {
        const diffDays = Math.ceil(Math.abs(Date.now() - item.date) / 86400000);
        if (timeFilter === 'Last 7 Days'  && diffDays > 7)  return false;
        if (timeFilter === 'Last 30 Days' && diffDays > 30) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (item.questionTitle || '').toLowerCase();
        return t.includes(q);
      }

      return true;
    });

  // ── Stats ────────────────────────────────────────────────────────────────
  const gvTotal    = gvProgress?.totalCompleted || 0;
  const gvStreak   = gvProgress?.currentStreak || 0;

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
        <ErrorMessage message={errGV?.message || 'Failed to load history.'} />
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
            <p className="text-gray-500 text-xs select-none">Your GV Challenge completions</p>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* STATS GRID */}
          <div className="grid grid-cols-2 gap-4 select-none">
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">GV Days</span>
              <strong className="text-2xl text-[#FF7A00] mt-1 block font-mono">{gvTotal}</strong>
            </div>
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">GV Streak</span>
              <strong className="text-2xl text-amber-400 mt-1 block font-mono">{gvStreak} 🔥</strong>
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
                        minHeight: '160px',
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
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
