import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { updateSolvedQuestions } from '../../store/authSlice';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { ArrowLeft } from 'lucide-react';
import QuestionLinks from '../../components/QuestionLinks';

const diffColors = {
  Easy:   'bg-emerald-500/10 text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-400',
  Hard:   'bg-rose-500/10 text-rose-400',
};

export default function TopicQuestions() {
  const { topicName } = useParams();
  const dispatch = useAppDispatch();
  const SIDEBAR_W = 224;

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [difficulty, setDifficulty] = useState('All');

  // Fetch questions for this topic
  const { data: questions = [], isLoading, isError, error } = useQuery({
    queryKey: ['topicQuestions', topicName],
    queryFn: async () => {
      const decodedTopic = decodeURIComponent(topicName);
      const res = await apiClient.get(`/api/questions/topic/${encodeURIComponent(decodedTopic)}`);
      return res.data;
    },
  });

  // Toggle Solved Status Action
  const handleSolveToggle = async (questionId, isSolved) => {
    if (!isAuthenticated) return;
    try {
      let updatedList;
      if (isSolved) {
        const response = await apiClient.delete(`/api/user/solve/${questionId}`);
        updatedList = response.data;
      } else {
        const response = await apiClient.post(`/api/user/solve/${questionId}`);
        updatedList = response.data;
      }
      dispatch(updateSolvedQuestions(updatedList));
    } catch (err) {
      console.error('Error updating solved status:', err);
    }
  };

  // Filtered questions based on chosen difficulty
  const filteredQuestions = questions.filter((q) => {
    if (difficulty === 'All') return true;
    return q.difficulty === difficulty;
  });

  const totalCount = filteredQuestions.length;
  const solvedCount = filteredQuestions.filter((q) =>
    user?.solvedQuestions?.some((sq) => sq.questionId === q._id)
  ).length;

  const solvedPercentage = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Top Header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link 
              to="/dashboard/roadmap" 
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-300 transition"
            >
              <ArrowLeft size={12} /> Back to Roadmap
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-white capitalize">
              {decodeURIComponent(topicName)} Questions
            </h1>
          </div>

          {/* Difficulty Filters */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`cursor-pointer px-4.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  difficulty === diff
                    ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Progress Banner */}
          {isAuthenticated && !isLoading && !isError && totalCount > 0 && (
            <div className="bg-[#0D0D12] border border-white/5 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-400">Topic Completion</span>
                <span className="text-[#FFB800]">
                  {solvedCount} / {totalCount} Solved ({solvedPercentage}%)
                </span>
              </div>
              <div className="w-full bg-[#0B0B0F] rounded-full h-3 overflow-hidden border border-white/5 p-0.5">
                <div
                  className="bg-gradient-to-r from-[#FF7A00] to-[#FFB800] h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${solvedPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Table Container */}
          {isLoading ? (
            <div className="bg-[#0D0D12] border border-white/5 rounded-2xl overflow-hidden p-6 space-y-4 animate-pulse">
              <div className="h-10 bg-white/5 rounded-lg" />
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="min-h-[200px] flex items-center justify-center p-6">
              <ErrorMessage message={error?.message || 'Failed to load topic questions.'} />
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-16 bg-[#0D0D12]/20 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
              No questions found for this difficulty level.
            </div>
          ) : (
            <div className="bg-[#0D0D12] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Difficulty</th>
                      <th className="px-6 py-4">Acceptance</th>
                      {isAuthenticated && <th className="px-6 py-4 text-center">Solved</th>}
                      <th className="px-6 py-4 text-center">Practice Links</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredQuestions.map((q, idx) => {
                      const isSolved = user?.solvedQuestions?.some(
                        (sq) => sq.questionId === q._id
                      );

                      return (
                        <tr
                          key={q._id}
                          className={`hover:bg-white/[0.01] transition-colors text-sm ${
                            isSolved ? 'bg-green-500/[0.02]' : ''
                          }`}
                        >
                          {/* S.No */}
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{idx + 1}</td>

                          {/* Title */}
                          <td className="px-6 py-4">
                            <a
                              href={q.leetcodeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-semibold hover:text-[#FF7A00] transition-colors cursor-pointer ${
                                isSolved ? 'line-through text-gray-500 font-normal' : 'text-white'
                              }`}
                            >
                              {q.title}
                            </a>
                          </td>

                          {/* Difficulty */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${diffColors[q.difficulty] || ''}`}
                            >
                              {q.difficulty}
                            </span>
                          </td>

                          {/* Acceptance */}
                          <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                            {q.acceptance || 'N/A'}
                          </td>

                          {/* Checkbox Solved */}
                          {isAuthenticated && (
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={!!isSolved}
                                onChange={() => handleSolveToggle(q._id, !!isSolved)}
                                className="cursor-pointer h-4 w-4 rounded border-white/10 bg-black text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00]"
                              />
                            </td>
                          )}

                           {/* LeetCode Link */}
                           <td className="px-6 py-4 text-center">
                             <QuestionLinks question={q} />
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
