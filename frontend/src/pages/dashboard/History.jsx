import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History as HistoryIcon, Calendar, ArrowRight, Layers, Flame, 
  Cpu, CheckCircle2, XCircle, Award, Eye, Clock, FileText, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSubmissions } from '../../api/playground';
import apiClient from '../../api/axios';

import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const diffColors = {
  Easy:   'text-green-400 bg-green-400/10 border-green-500/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20',
  Hard:   'text-red-400 bg-red-400/10 border-red-500/20',
  Mixed:  'text-orange-400 bg-orange-400/10 border-orange-500/20',
};

export default function History() {
  const SIDEBAR_W = 224;
  const [filterType, setFilterType] = useState('All');
  const [selectedExam, setSelectedExam] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 1. Fetch practice submissions
  const { data: submissions = [], isLoading: loadingSubmissions, isError: errorSub, error: errSub } = useQuery({
    queryKey: ['submissionsHistory'],
    queryFn: getSubmissions,
    staleTime: 10 * 1000,
  });

  // 2. Fetch mock exam history
  const { data: mockHistory = [], isLoading: loadingHistory, isError: errorMock, error: errMock } = useQuery({
    queryKey: ['mockExamHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/history');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const isLoading = loadingSubmissions || loadingHistory;
  const isError = errorSub || errorMock;
  const errorMessage = errSub?.message || errMock?.message || 'Failed to load history data.';

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
        <ErrorMessage message={errorMessage} />
      </div>
    );
  }

  // Format date helper (e.g., June 21)
  const formatDateShort = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Capitalize helper
  const capitalize = (str) => {
    if (!str) return '';
    return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Normalize Submissions for feed timeline
  const normalizedSubmissions = submissions.map(sub => ({
    id: sub._id,
    type: 'submission',
    subType: sub.type, // 'dsa' | 'playground' | 'mock'
    title: sub.questionId?.title || 'Unknown Question',
    difficulty: sub.questionId?.difficulty || 'Medium',
    status: sub.status,
    date: new Date(sub.submittedAt || sub.createdAt),
    streakDay: sub.streakDay || 0,
    language: sub.language || 'Mixed',
    original: sub
  }));

  // Normalize Mock Exams for feed timeline
  const normalizedExams = mockHistory.map(exam => {
    const timeTakenSec = exam.endTime ? Math.round((new Date(exam.endTime) - new Date(exam.startTime)) / 1000) : 0;
    const timeTakenMin = timeTakenSec > 0 ? Math.round(timeTakenSec / 60) : exam.timeLimit;

    return {
      id: exam._id,
      type: 'exam',
      subType: 'mock',
      title: `Mock Exam — ${capitalize(exam.company)}`,
      difficulty: exam.difficulty || 'Mixed',
      status: `${exam.score}/${exam.questions.length}`,
      date: new Date(exam.endTime || exam.startTime),
      streakDay: 0,
      timeTaken: timeTakenMin,
      original: exam
    };
  });

  // Merge & Sort chronologically (most recent first)
  const mergedTimeline = [...normalizedSubmissions, ...normalizedExams]
    .sort((a, b) => b.date - a.date);

  // Apply filters
  const filteredTimeline = mergedTimeline.filter(item => {
    if (filterType === 'All') return true;
    if (filterType === 'DSA Practice') return item.type === 'submission' && item.subType === 'dsa';
    if (filterType === 'Arena') return item.type === 'submission' && item.subType === 'playground';
    if (filterType === 'Mock Exam') return item.type === 'exam';
    return true;
  });

  // Open exam details modal handler
  const handleOpenModal = (exam) => {
    setSelectedExam(exam);
    setShowModal(true);
  };

  // Compute breakdown difficulty statistics for modal
  const getExamStats = (exam) => {
    if (!exam) return { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } };
    const breakdown = {
      Easy: { solved: 0, total: 0 },
      Medium: { solved: 0, total: 0 },
      Hard: { solved: 0, total: 0 }
    };
    exam.questions.forEach(q => {
      const diff = q.questionId?.difficulty || 'Medium';
      if (breakdown[diff]) {
        breakdown[diff].total++;
        if (q.isCorrect) {
          breakdown[diff].solved++;
        }
      }
    });
    return breakdown;
  };

  const modalBreakdown = selectedExam ? getExamStats(selectedExam) : null;
  const examDurationSeconds = selectedExam && selectedExam.endTime
    ? Math.round((new Date(selectedExam.endTime) - new Date(selectedExam.startTime)) / 1000)
    : 0;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Header and Filter */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-white font-bold text-lg flex items-center gap-2">
              <HistoryIcon size={18} className="text-[#FF7A00]" />
              Submission History
            </h1>
            <p className="text-gray-500 text-xs">Review your practice history, playground code attempts, and mock tests</p>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl overflow-x-auto max-w-full">
            {['All', 'DSA Practice', 'Arena', 'Mock Exam'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`cursor-pointer px-4.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  filterType === t 
                    ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6">
          {/* Top Stat Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total submissions card */}
            <div className="bg-[#0D0D12] border border-white/5 rounded-2xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-extrabold tracking-wider block">Total Submissions</span>
                <span className="text-2xl font-black text-white mt-1 block">{submissions.length}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF7A00]">
                <Layers size={18} />
              </div>
            </div>

            {/* Mock exams taken card */}
            <div className="bg-[#0D0D12] border border-white/5 rounded-2xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-extrabold tracking-wider block">Mock Exams Taken</span>
                <span className="text-2xl font-black text-white mt-1 block">{mockHistory.length}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#FFB800]">
                <Award size={18} />
              </div>
            </div>
          </div>

          {/* Activity Timeline List */}
          {mergedTimeline.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl max-w-xl mx-auto p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto mb-4">
                <HistoryIcon size={20} className="text-[#FF7A00]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No activity logs</h2>
              <p className="text-gray-500 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
                Start practicing DSA questions or take a Mock Exam to fill your timeline history.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/dashboard/dsa" className="inline-flex items-center gap-1.5 text-xs font-bold text-black px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 transition-opacity">
                  Practice DSA <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No history found matching "{filterType}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTimeline.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                  className="bg-[#0D0D12] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
                >
                  {/* Left segment details */}
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Visual icon representation */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold border text-sm ${
                      item.type === 'exam' 
                        ? 'bg-amber-500/10 border-amber-500/20 text-[#FFB800]' 
                        : 'bg-white/5 border-white/5 text-[#FF7A00]'
                    }`}>
                      {item.type === 'exam' ? '📝' : '💻'}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-bold text-sm leading-snug">{item.title}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${diffColors[item.difficulty] || diffColors.Medium}`}>
                          {item.difficulty}
                        </span>
                      </div>
                      
                      {/* Sub stats description line */}
                      <div className="text-gray-500 text-xs flex items-center gap-2 flex-wrap">
                        {item.type === 'exam' ? (
                          <span>Score: <strong className="text-white">{item.status}</strong> | Time: {item.timeTaken} min</span>
                        ) : (
                          <span>Lang: <strong className="text-gray-400 capitalize">{item.language}</strong></span>
                        )}
                        <span className="text-gray-700 select-none">•</span>
                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 capitalize">
                          {item.type === 'exam' ? 'Mock Exam' : item.subType === 'dsa' ? 'DSA Practice' : 'Arena'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right segment meta and CTA actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-white/5 pt-3 sm:border-none sm:pt-0">
                    <div className="flex items-center gap-2.5">
                      {/* Submission Status for playground compiles */}
                      {item.type === 'submission' && (
                        item.status === 'passed' ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 size={11} />
                            Passed
                          </span>
                        ) : item.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg">
                            <XCircle size={11} />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-500/10 border border-gray-500/20 px-2 py-0.5 rounded-lg">
                            <Cpu size={11} />
                            Submitted
                          </span>
                        )
                      )}

                      {/* Streak count day info */}
                      {item.streakDay > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-orange-400 text-xs font-bold bg-[#FF7A00]/10 border border-[#FF7A00]/20 px-2 py-0.5 rounded-lg">
                          <Flame size={11} className="fill-orange-500 text-orange-500" />
                          🔥 {item.streakDay}
                        </span>
                      )}

                      {/* Simple short date display */}
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDateShort(item.date)}
                      </span>
                    </div>

                    {/* View mock details triggers */}
                    {item.type === 'exam' && (
                      <button
                        onClick={() => handleOpenModal(item.original)}
                        className="cursor-pointer text-xs font-bold text-[#FF7A00] hover:text-[#FFB800] transition-colors flex items-center gap-0.5 border-l border-white/5 pl-4 py-1"
                      >
                        <Eye size={12} /> View Details
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Exam Breakdown Details Modal Popup */}
      <AnimatePresence>
        {showModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D0D12] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-6"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Title & Metadata Header */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#FF7A00] flex items-center gap-1">
                  <FileText size={10} />
                  Mock Exam Results
                </span>
                <h2 className="text-lg font-black text-white capitalize">
                  {capitalize(selectedExam.company)} Assessment
                </h2>
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Award size={13} className="text-[#FFB800]" /> Score: {selectedExam.score} / {selectedExam.questions.length}
                  </span>
                  <span className="flex items-center gap-1 border-l border-white/5 pl-4">
                    <Clock size={13} /> 
                    {examDurationSeconds > 0 
                      ? `${Math.round(examDurationSeconds / 60)}m ${examDurationSeconds % 60}s` 
                      : `${selectedExam.timeLimit} min`}
                  </span>
                  <span className="flex items-center gap-1 border-l border-white/5 pl-4 capitalize">
                    Difficulty: {selectedExam.difficulty}
                  </span>
                </div>
              </div>

              {/* Difficulty Breakdown Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Difficulty Breakdown</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map(diff => {
                    const diffStats = modalBreakdown[diff] || { solved: 0, total: 0 };
                    return (
                      <div key={diff} className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">{diff}</span>
                        <span className="text-xs font-black text-white mt-1 block">
                          {diffStats.solved} / {diffStats.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question list checklist */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Question List Review</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedExam.questions.map((q, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-xs py-2 px-3 bg-white/[0.01] border border-white/5 rounded-xl gap-4"
                    >
                      <span className="text-gray-300 font-semibold truncate">
                        {q.questionId?.title || 'Unknown Question'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[10px] shrink-0 border ${
                        q.isCorrect 
                          ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                          : 'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>
                        {q.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <button 
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity"
              >
                Close Review
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
