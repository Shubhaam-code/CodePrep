import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Calendar, ArrowRight, Layers, Flame, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSubmissions } from '../../api/playground';

import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const diffColors = {
  Easy:   'text-green-400 bg-green-400/10 border-green-500/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20',
  Hard:   'text-red-400 bg-red-400/10 border-red-500/20',
};

const typeLabels = {
  dsa: { label: 'DSA Practice', color: 'text-orange-400 bg-orange-400/10 border-orange-500/20' },
  playground: { label: 'Playground', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' },
  mock: { label: 'Mock Exam', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
};

export default function History() {
  const SIDEBAR_W = 224;
  const [filterType, setFilterType] = useState('All');

  // Fetch submissions history
  const { data: submissions = [], isLoading, isError, error } = useQuery({
    queryKey: ['submissionsHistory'],
    queryFn: getSubmissions,
    staleTime: 10 * 1000, // 10 seconds stale time
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
        <ErrorMessage message={error?.message || 'Failed to load submission history.'} />
      </div>
    );
  }

  // Filter submissions by type
  const filtered = submissions.filter(sub => {
    if (filterType === 'All') return true;
    if (filterType === 'DSA Practice') return sub.type === 'dsa';
    if (filterType === 'Playground') return sub.type === 'playground';
    if (filterType === 'Mock Exam') return sub.type === 'mock';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
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
            <p className="text-gray-500 text-xs">Review your DSA practices, playground coding history, and mock assessment results</p>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            {['All', 'DSA Practice', 'Playground', 'Mock Exam'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`cursor-pointer px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
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
        <div className="p-6">
          {submissions.length === 0 ? (
            /* Empty state if nothing solved */
            <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl max-w-xl mx-auto p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto mb-4">
                <HistoryIcon size={20} className="text-[#FF7A00]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No submission history</h2>
              <p className="text-gray-500 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
                You haven't made any submissions yet. Solve today's daily challenge or practice DSA questions to start tracking your progress!
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link to="/dashboard/dsa" className="inline-flex items-center gap-2 text-xs font-bold text-black px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 transition-opacity">
                  Practice DSA <ArrowRight size={14} />
                </Link>
                <Link to="/dashboard/playground" className="inline-flex items-center gap-2 text-xs font-bold text-white px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                  Daily Challenge
                </Link>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state for filter */
            <div className="text-center py-16 text-gray-500 text-sm">
              No submissions found under the "{filterType}" category.
            </div>
          ) : (
            /* Submission Table */
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0D0D12] border border-white/5 rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Question</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Streak Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {filtered.map((item) => {
                        const typeInfo = typeLabels[item.type] || { label: 'Playground', color: 'text-gray-400 bg-gray-400/10 border-gray-500/20' };
                        const qTitle = item.questionId?.title || 'Unknown Question';
                        const qDifficulty = item.questionId?.difficulty || 'Medium';

                        return (
                          <motion.tr 
                            layout
                            key={item._id} 
                            className="hover:bg-white/[0.01] transition-colors text-sm"
                          >
                            {/* Question Title & Difficulty */}
                            <td className="px-6 py-4 font-semibold text-white">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="text-white hover:text-[#FF7A00] transition-colors cursor-default">
                                  {qTitle}
                                </span>
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border self-start ${diffColors[qDifficulty] || ''}`}>
                                  {qDifficulty}
                                </span>
                              </div>
                            </td>

                            {/* Submission Type */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${typeInfo.color}`}>
                                <Layers size={11} />
                                {typeInfo.label}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              {item.status === 'passed' ? (
                                <span className="inline-flex items-center gap-1 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                                  <CheckCircle2 size={12} />
                                  Passed
                                </span>
                              ) : item.status === 'failed' ? (
                                <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                                  <XCircle size={12} />
                                  Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-500/10 border border-gray-500/20 px-2 py-1 rounded-lg">
                                  <Cpu size={12} />
                                  Submitted
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                              <span className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-[#FF7A00]" />
                                {new Date(item.submittedAt || item.createdAt).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </td>

                            {/* Streak Day */}
                            <td className="px-6 py-4">
                              {item.streakDay > 0 ? (
                                <span className="inline-flex items-center gap-1 text-orange-400 text-xs font-bold bg-[#FF7A00]/10 border border-[#FF7A00]/20 px-2.5 py-1 rounded-lg shadow-sm">
                                  <Flame size={12} className="fill-orange-500 text-orange-500" />
                                  🔥 {item.streakDay} {item.streakDay === 1 ? 'day' : 'days'}
                                </span>
                              ) : (
                                <span className="text-gray-600 text-xs font-mono">-</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
