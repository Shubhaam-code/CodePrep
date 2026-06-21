import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../store/store';
import { updateSolvedQuestions, updateBookmarks } from '../store/authSlice';
import apiClient from '../api/axios';

/**
 * Capitalizes company name cleanly (e.g. goldman-sachs -> Goldman Sachs).
 */
const formatCompanyName = (name) => {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function CompanyPage() {
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  // Read auth state from Redux
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Extract filter parameters from URL
  const timeframe = searchParams.get('timeframe') || 'alltime';
  const difficulty = searchParams.get('difficulty') || 'All';

  // Fetch company questions
  const { data: companyQuestions, isLoading, isError, error } = useQuery({
    queryKey: ['companyQuestions', name, timeframe, difficulty],
    queryFn: async () => {
      // Map 'All' difficulty to an empty string parameter
      const diffParam = difficulty === 'All' ? '' : difficulty;
      let url = `/api/companies/${name}?timeframe=${timeframe}`;
      if (diffParam) {
        url += `&difficulty=${diffParam}`;
      }
      const response = await apiClient.get(url);
      return response.data;
    },
  });

  // Calculate maximum frequency in current dataset for relative visual bar rendering
  const maxFrequency = companyQuestions && companyQuestions.length > 0
    ? Math.max(...companyQuestions.map(cq => cq.frequency))
    : 1;

  // Filter lists & helper checks
  const totalQuestionsCount = companyQuestions ? companyQuestions.length : 0;
  const solvedQuestionsCount = companyQuestions
    ? companyQuestions.filter((cq) =>
        user?.solvedQuestions?.some(
          (sq) => sq.questionId === cq.question?._id
        )
      ).length
    : 0;

  const solvedPercentage = totalQuestionsCount > 0
    ? Math.round((solvedQuestionsCount / totalQuestionsCount) * 100)
    : 0;

  // Filter setters
  const setTimeframe = (val) => {
    setSearchParams((prev) => {
      prev.set('timeframe', val);
      return prev;
    });
  };

  const setDifficulty = (val) => {
    setSearchParams((prev) => {
      prev.set('difficulty', val);
      return prev;
    });
  };

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

  // Toggle Bookmark Action
  const handleBookmarkToggle = async (questionId, isBookmarked) => {
    if (!isAuthenticated) return;
    try {
      let updatedList;
      if (isBookmarked) {
        const response = await apiClient.delete(`/api/user/bookmark/${questionId}`);
        updatedList = response.data;
      } else {
        const response = await apiClient.post(`/api/user/bookmark/${questionId}`);
        updatedList = response.data;
      }
      dispatch(updateBookmarks(updatedList));
    } catch (err) {
      console.error('Error updating bookmark status:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb & Title */}
      <div className="space-y-2">
        <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition">
          &larr; Back to Companies
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
          {formatCompanyName(name)} Questions
        </h1>
      </div>

      {/* Interactive Filters Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
        {/* Timeframes tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All Time', value: 'alltime' },
            { label: '6 Months', value: '6months' },
            { label: '1 Year', value: '1year' },
            { label: '2 Years', value: '2year' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTimeframe(tab.value)}
            className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              timeframe === tab.value
                ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-bold shadow-lg shadow-[#FF7A00]/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Difficulty Buttons */}
        <div className="flex items-center gap-1.5">
          {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff)}
              className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                difficulty === diff
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar Display */}
      {isAuthenticated && !isLoading && !isError && totalQuestionsCount > 0 && (
        <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-slate-400">Your Progress</span>
            <span className="text-[#FFB800]">
              {solvedQuestionsCount} / {totalQuestionsCount} Solved ({solvedPercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-[#FF7A00] to-[#FFB800] h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${solvedPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Table view */}
      {isLoading ? (
        /* Loading Skeleton rows */
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden p-6 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-900 rounded-lg" />
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-slate-900/50 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        /* Error Alert message */
        <div className="text-center py-12 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-md mx-auto">
          <p className="text-red-400 font-semibold">Error retrieving questions</p>
          <p className="text-xs text-red-500/80 mt-1">{error?.message || 'Something went wrong.'}</p>
        </div>
      ) : totalQuestionsCount === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
          No questions found matching your filter criteria.
        </div>
      ) : (
        /* Data Table */
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4 text-center">Difficulty</th>
                  <th className="px-6 py-4 text-center">Acceptance</th>
                  <th className="px-6 py-4">Frequency</th>
                  {isAuthenticated && (
                    <>
                      <th className="px-6 py-4 text-center">Solved</th>
                      <th className="px-6 py-4 text-center">Bookmark</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-center">LeetCode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {companyQuestions.map((cq, idx) => {
                  const q = cq.question;
                  if (!q) return null;

                  const isSolved = user?.solvedQuestions?.some(
                    (sq) => sq.questionId === q._id
                  );

                  const isBookmarked = user?.bookmarks?.some((b) => {
                    const bId = typeof b === 'object' && b?._id ? b._id : b;
                    return bId.toString() === q._id.toString();
                  });

                  // Calculate relative frequency width
                  const freqPercent = getCompanyGradientWidth(cq.frequency, maxFrequency);

                  return (
                    <tr
                      key={cq._id}
                      className={`hover:bg-slate-900/35 transition-colors text-sm ${
                        isSolved ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* S.No */}
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{idx + 1}</td>

                      {/* Title */}
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold transition ${
                            isSolved
                              ? 'line-through text-slate-500'
                              : 'text-slate-200'
                          }`}
                        >
                          {q.title}
                        </span>
                      </td>

                      {/* Difficulty Badge */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            q.difficulty === 'Easy'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : q.difficulty === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </td>

                      {/* Acceptance Percentage */}
                      <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                        {q.acceptance || 'N/A'}
                      </td>

                      {/* Frequency Metric visually represented */}
                      <td className="px-6 py-4 w-36">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                            <div
                              className="bg-gradient-to-r from-[#FF7A00] to-[#FFB800] h-full rounded-full"
                              style={{ width: `${freqPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {cq.frequency.toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Checkbox Solved Toggle */}
                      {isAuthenticated && (
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!isSolved}
                            onChange={() => handleSolveToggle(q._id, !!isSolved)}
                            className="cursor-pointer h-4 w-4 rounded border-slate-800 bg-slate-950 text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00]"
                          />
                        </td>
                      )}

                      {/* Bookmark Icon Toggle */}
                      {isAuthenticated && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleBookmarkToggle(q._id, !!isBookmarked)}
                            className={`cursor-pointer text-base hover:scale-110 transition ${
                              isBookmarked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            {isBookmarked ? '★' : '☆'}
                          </button>
                        </td>
                      )}

                      {/* External Leetcode Link */}
                      <td className="px-6 py-4 text-center">
                        {q.leetcodeUrl ? (
                          <a
                            href={q.leetcodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-[#FFB800] transition inline-block"
                            title="Open in Leetcode"
                          >
                            &#8599;
                          </a>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
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
  );
}

/**
 * Normalizes frequency width against the maximum frequency present.
 */
const getCompanyGradientWidth = (freq, maxFreq) => {
  if (maxFreq === 0) return 0;
  return Math.min(100, (freq / maxFreq) * 100);
};

export default CompanyPage;
