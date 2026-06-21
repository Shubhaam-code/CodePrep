import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History as HistoryIcon, Search, Calendar, Trophy, Skull, 
  Clock, Award, Eye, Trash2, ArrowRight, ShieldAlert, 
  Briefcase, Cpu, HelpCircle, AlertCircle, Swords, CheckCircle2, XCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

export default function History() {
  const SIDEBAR_W = 224;
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Mock Tests' | 'Arena Battles'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Completed' | 'Active' | 'Wins' | 'Losses'
  const [timeFilter, setTimeFilter] = useState('All'); // 'All' | 'Last 7 Days' | 'Last 30 Days'

  // Modals for detail views
  const [selectedMock, setSelectedMock] = useState(null);
  const [selectedArena, setSelectedArena] = useState(null);

  // 1. Fetch Mock Exam History
  const { data: mockHistory = [], isLoading: loadingMock, isError: errorMock, error: errMock } = useQuery({
    queryKey: ['mockHistoryUnified'],
    queryFn: async () => {
      const res = await apiClient.get('/api/history');
      return res.data;
    },
    staleTime: 10 * 1000
  });

  // 2. Fetch Arena Match History
  const { data: arenaHistory = [], isLoading: loadingArena, isError: errorArena, error: errArena } = useQuery({
    queryKey: ['arenaHistoryUnified'],
    queryFn: async () => {
      const res = await apiClient.get('/api/arena/history');
      return res.data;
    },
    staleTime: 10 * 1000
  });

  const isLoading = loadingMock || loadingArena;
  const isError = errorMock || errorArena;
  const errorDetails = errMock?.message || errArena?.message || 'Failed to load history data.';

  // Format capitalizer
  const capitalize = (str) => {
    if (!str) return '';
    return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Date short formatter
  const formatDateShort = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 3. Compile Statistics Section
  const totalMocks = mockHistory.length;
  
  // Average Score Calculation
  const totalMockAccuracySum = mockHistory.reduce((sum, exam) => {
    const score = exam.score || 0;
    const qCount = exam.questions?.length || 1;
    return sum + (score / qCount);
  }, 0);
  const averageAccuracy = totalMocks > 0 ? Math.round((totalMockAccuracySum / totalMocks) * 100) : 0;

  const totalArenaMatches = arenaHistory.length;
  const winCount = arenaHistory.filter(m => m.result === 'win').length;
  const winRate = totalArenaMatches > 0 ? Math.round((winCount / totalArenaMatches) * 100) : 0;

  // 4. Normalize & Merge Timeline list
  const normalizedMocks = mockHistory.map(exam => {
    const score = exam.score || 0;
    const totalQ = exam.questions?.length || 0;
    const accuracy = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;
    const timeTakenMin = exam.endTime 
      ? Math.round((new Date(exam.endTime) - new Date(exam.startTime)) / 60000)
      : exam.timeLimit;

    return {
      id: exam._id,
      historyType: 'Mock Test',
      title: `Mock Test — ${capitalize(exam.company)}`,
      score: `${score} / ${totalQ}`,
      accuracy: `${accuracy}% Accuracy`,
      timeTaken: `${timeTakenMin} mins`,
      status: exam.status === 'completed' ? 'Completed' : 'Active',
      date: new Date(exam.endTime || exam.startTime),
      original: exam
    };
  });

  const normalizedArena = arenaHistory.map(match => {
    const isWin = match.result === 'win';
    // Opponent rating change mock values for gamification (e.g. +20 on win, -10 on loss)
    const ratingChange = isWin ? '+20 Arena Points' : '-10 Arena Points';
    
    return {
      id: match._id,
      historyType: 'Arena Battle',
      title: match.questionTitle || 'Coding Duel',
      opponentName: match.opponentName || 'Unknown Rival',
      result: isWin ? 'Win' : 'Loss',
      ratingChange,
      problemsSolved: isWin ? '1 Problem Solved' : '0 Problems Solved',
      date: new Date(match.date || match.createdAt),
      runtime: match.runtime || 0,
      original: match
    };
  });

  const mergedHistory = [...normalizedMocks, ...normalizedArena].sort((a, b) => b.date - a.date);

  // 5. Apply filters and search query
  const filteredHistory = mergedHistory.filter(item => {
    // A. Filter by Tab
    if (activeTab === 'Mock Tests' && item.historyType !== 'Mock Test') return false;
    if (activeTab === 'Arena Battles' && item.historyType !== 'Arena Battle') return false;

    // B. Filter by Status chip
    if (statusFilter !== 'All') {
      if (statusFilter === 'Completed' && item.status !== 'Completed') return false;
      if (statusFilter === 'Active' && item.status !== 'Active') return false;
      if (statusFilter === 'Wins' && item.result !== 'Win') return false;
      if (statusFilter === 'Losses' && item.result !== 'Loss') return false;
    }

    // C. Filter by Date range chip
    if (timeFilter !== 'All') {
      const now = new Date();
      const diffTime = Math.abs(now - item.date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (timeFilter === 'Last 7 Days' && diffDays > 7) return false;
      if (timeFilter === 'Last 30 Days' && diffDays > 30) return false;
    }

    // D. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchOpponent = item.opponentName ? item.opponentName.toLowerCase().includes(query) : false;
      return matchTitle || matchOpponent;
    }

    return true;
  });

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
        <ErrorMessage message={errorDetails} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto pb-12" style={{ marginLeft: SIDEBAR_W }}>
        
        {/* Sticky top header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-white font-bold text-lg flex items-center gap-2 select-none">
              <HistoryIcon size={18} className="text-[#FF7A00]" />
              Assessment & Battle History
            </h1>
            <p className="text-gray-500 text-xs select-none">Monitor your technical mock test performance and 1v1 Arena matches</p>
          </div>

          {/* Grouping Filter Tabs */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl shrink-0 select-none">
            {['All', 'Mock Tests', 'Arena Battles'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setStatusFilter('All'); }}
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

        {/* Content Area */}
        <div className="p-6 space-y-6">
          
          {/* STATISTICS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            {/* Total Mocks */}
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">Total Mocks</span>
              <strong className="text-2xl text-white mt-1 block font-mono">{totalMocks}</strong>
            </div>

            {/* Average accuracy */}
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">Avg Score Accuracy</span>
              <strong className="text-2xl text-[#FFB800] mt-1 block font-mono">{averageAccuracy}%</strong>
            </div>

            {/* Total Arena matches */}
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">Arena Battles</span>
              <strong className="text-2xl text-white mt-1 block font-mono">{totalArenaMatches}</strong>
            </div>

            {/* Arena win rate */}
            <div className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">Arena Win Rate</span>
              <strong className="text-2xl text-green-400 mt-1 block font-mono">{winRate}%</strong>
            </div>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-[#0D0D12] border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg select-none">
            {/* Search Input bar */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 w-full md:max-w-xs">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search history by name/rival..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full font-sans"
              />
            </div>

            {/* Filter chips rows */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-400">
              {/* Type Status Selector */}
              <div className="flex items-center gap-1.5">
                <span>Status:</span>
                <div className="flex bg-black border border-white/5 p-0.5 rounded-lg">
                  {activeTab !== 'Arena Battles' && (
                    <>
                      <button 
                        onClick={() => setStatusFilter('All')}
                        className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${statusFilter === 'All' ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'}`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setStatusFilter('Completed')}
                        className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${statusFilter === 'Completed' ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'}`}
                      >
                        Completed
                      </button>
                      <button 
                        onClick={() => setStatusFilter('Active')}
                        className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${statusFilter === 'Active' ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'}`}
                      >
                        Active
                      </button>
                    </>
                  )}
                  {activeTab === 'Arena Battles' && (
                    <>
                      <button 
                        onClick={() => setStatusFilter('All')}
                        className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${statusFilter === 'All' ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'}`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setStatusFilter('Wins')}
                        className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${statusFilter === 'Wins' ? 'bg-green-500/10 text-green-400' : 'hover:text-white'}`}
                      >
                        Wins
                      </button>
                      <button 
                        onClick={() => setStatusFilter('Losses')}
                        className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${statusFilter === 'Losses' ? 'bg-red-500/10 text-red-400' : 'hover:text-white'}`}
                      >
                        Losses
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Date Selector */}
              <div className="flex items-center gap-1.5">
                <span>Date:</span>
                <div className="flex bg-black border border-white/5 p-0.5 rounded-lg">
                  {['All', 'Last 7 Days', 'Last 30 Days'].map(timeOption => (
                    <button
                      key={timeOption}
                      onClick={() => setTimeFilter(timeOption)}
                      className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition-all ${
                        timeFilter === timeOption 
                          ? 'bg-[#FF7A00]/10 text-[#FF7A00]' 
                          : 'hover:text-white'
                      }`}
                    >
                      {timeOption.replace('Last ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* HISTORY CARDS LIST VIEW */}
          {filteredHistory.length === 0 ? (
            /* EMPTY STATE illustration */
            <div className="max-w-md mx-auto text-center py-20 bg-[#0D0D12]/20 border border-dashed border-white/10 p-8 rounded-3xl space-y-5">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-gray-500">
                <HistoryIcon size={28} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-white font-bold text-base font-sans">No History Yet</h3>
                <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto font-sans">
                  We couldn't find any completed tests or arena battles matching these search filters.
                </p>
              </div>

              <button
                onClick={() => navigate('/dashboard/mock')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-1"
              >
                Start Mock Test <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            /* Card list grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredHistory.map((item, idx) => {
                  const isMock = item.historyType === 'Mock Test';

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.25) }}
                      className="bg-[#0D0D12]/80 border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-48 relative overflow-hidden group shadow-lg"
                    >
                      {/* Glassmorphism gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/0 to-transparent group-hover:via-[#FF7A00]/25 transition-all" />

                      <div className="space-y-3">
                        {/* Type badge and Date */}
                        <div className="flex items-center justify-between text-[10px] select-none">
                          <span className={`px-2 py-0.5 rounded-lg border font-bold ${
                            isMock 
                              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                              : 'text-[#FF7A00] bg-[#FF7A00]/10 border-[#FF7A00]/20'
                          }`}>
                            {item.historyType}
                          </span>
                          <span className="text-gray-500 font-mono font-semibold flex items-center gap-1">
                            <Calendar size={10} /> {formatDateShort(item.date)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-white font-extrabold text-sm sm:text-base group-hover:text-[#FFB800] transition-colors truncate">
                          {item.title}
                        </h3>

                        {/* Card Meta Stats (Mock vs Arena) */}
                        {isMock ? (
                          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 font-mono">
                            <div>Score: <strong className="text-white">{item.score}</strong></div>
                            <div>Accuracy: <strong className="text-[#FFB800]">{item.accuracy}</strong></div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-sans">
                              <Clock size={11} /> {item.timeTaken}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-400">
                              Rival: <strong className="text-white">{item.opponentName}</strong>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono">
                              <span className={`font-bold ${item.result === 'Win' ? 'text-green-400' : 'text-red-400'}`}>
                                {item.result === 'Win' ? '🏆 Victory' : '💀 Defeated'}
                              </span>
                              <span className="text-gray-500">({item.problemsSolved})</span>
                              <span className="text-[#FFB800] font-bold">{item.ratingChange}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action CTA Button */}
                      <div className="pt-3 border-t border-white/5 mt-auto flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 select-none">Details</span>
                        {isMock ? (
                          <button
                            onClick={() => { setSelectedMock(item.original); }}
                            className="cursor-pointer text-xs font-bold text-[#FF7A00] group-hover:text-white transition-colors flex items-center gap-1"
                          >
                            View Report <Eye size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedArena(item.original); }}
                            className="cursor-pointer text-xs font-bold text-[#FF7A00] group-hover:text-white transition-colors flex items-center gap-1"
                          >
                            View Match <Swords size={12} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* MOCK RESULT POPUP REPORT DETAIL MODAL */}
      <AnimatePresence>
        {selectedMock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 15 }}
              className="bg-[#0D0D12] border border-white/5 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Performance Details</span>
                  <h3 className="text-white font-bold text-sm">Mock Assessment — {capitalize(selectedMock.company)}</h3>
                </div>
                <button 
                  onClick={() => { setSelectedMock(null); }}
                  className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl bg-white/[0.01]"
                >
                  Close
                </button>
              </div>

              {/* Stats overview cards */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-gray-500 block">Score</span>
                  <strong className="text-sm text-[#FFB800] mt-1 block font-mono">{selectedMock.score} / {selectedMock.questions?.length}</strong>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-gray-500 block">Difficulty</span>
                  <strong className="text-sm text-white mt-1 block">{capitalize(selectedMock.difficulty)}</strong>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-gray-500 block">Duration Limit</span>
                  <strong className="text-sm text-white mt-1 block font-mono">{selectedMock.timeLimit} min</strong>
                </div>
              </div>

              {/* Questions table */}
              <div className="space-y-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block">Question breakdown</span>
                <div className="space-y-2">
                  {selectedMock.questions?.map((q, idx) => (
                    <div key={idx} className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-white font-sans font-bold block mb-0.5">{idx + 1}. {q.questionId?.title || 'Coding Challenge'}</span>
                        <span className="text-gray-500 text-[10px] font-bold">Selected Ans: <strong className="text-[#FFB800]">{q.userAnswer || 'Skipped'}</strong></span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg border text-[9px] font-bold border-white/5 text-gray-500 bg-white/5 font-sans">
                          {q.questionId?.difficulty || 'Easy'}
                        </span>
                        {q.isCorrect ? (
                          <CheckCircle2 size={15} className="text-green-500" />
                        ) : (
                          <XCircle size={15} className="text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ARENA BATTLE VIEW DETAIL MODAL */}
      <AnimatePresence>
        {selectedArena && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 15 }}
              className="bg-[#0D0D12] border border-white/5 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-center space-y-6"
            >
              <div className="w-14 h-14 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto text-[#FF7A00]">
                <Swords size={24} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-white font-black text-xl">1v1 Arena Duel details</h3>
                <p className="text-gray-500 text-xs">Overview stats of your custom room match</p>
              </div>

              {/* Stats card parameters */}
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
                  <span className="text-white font-bold">{selectedArena.result === 'win' ? `${selectedArena.runtime} ms` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Solved Date:</span>
                  <span className="text-white font-bold">{formatDateShort(selectedArena.date)}</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedArena(null)}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Match Report
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
