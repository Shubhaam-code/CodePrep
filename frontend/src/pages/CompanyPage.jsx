import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../store/store';
import { updateBookmarks, setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaRegCircle,
  FaBookmark,
  FaRegBookmark,
  FaSearch,
  FaSpinner,
  FaFire,
  FaTrophy
} from 'react-icons/fa';

const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';

const DIFFICULTY_STYLE = {
  Easy:   { bg: 'rgba(34,197,94,0.08)',   color: '#22c55e', border: 'rgba(34,197,94,0.2)', dot: 'bg-22c55e' },
  Medium: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', border: 'rgba(245,158,11,0.2)', dot: 'bg-f59e0b' },
  Hard:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', border: 'rgba(239,68,68,0.2)', dot: 'bg-ef4444' },
};

const formatCompanyName = (name) => {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ─── Animated Counter Component ───────────────────────────────────────────────
const AnimatedCounter = React.memo(function AnimatedCounter({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const stringVal = String(value);
    const match = stringVal.match(/^(\d+)(.*)$/);
    if (!match) {
      setDisplayValue(stringVal);
      return;
    }

    const endNumber = parseInt(match[1], 10);
    const suffix = match[2] || '';
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * endNumber);
      
      setDisplayValue(`${current}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(stringVal);
      }
    };

    requestAnimationFrame(update);
  }, [value, duration]);

  return <span>{displayValue}</span>;
});

// ─── Circular SVG Progress Ring ───────────────────────────────────────────────
const CircularProgress = React.memo(function CircularProgress({ pct, size = 92, stroke = 7, color = ORANGE }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
      />
    </svg>
  );
});

export default function CompanyPage() {
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // local search state for filtering questions
  const [localSearch, setLocalSearch] = useState('');

  // Refresh user solved state
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/api/auth/me')
      .then((res) => {
        if (!cancelled && res?.data) {
          dispatch(setUser(res.data));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const timeframe = searchParams.get('timeframe') || 'alltime';
  const difficulty = searchParams.get('difficulty') || 'All';

  // Fetch company questions
  const { data: companyQuestions, isLoading, isError, error } = useQuery({
    queryKey: ['companyQuestions', name, timeframe, difficulty],
    queryFn: async () => {
      const diffParam = difficulty === 'All' ? '' : difficulty;
      let url = `/api/companies/${name}?timeframe=${timeframe}`;
      if (diffParam) {
        url += `&difficulty=${diffParam}`;
      }
      const response = await apiClient.get(url);
      return response.data;
    },
  });

  const maxFrequency = useMemo(() => {
    if (!companyQuestions || companyQuestions.length === 0) return 1;
    return Math.max(...companyQuestions.map(cq => cq.frequency || 0), 1);
  }, [companyQuestions]);

  const totalQuestionsCount = companyQuestions ? companyQuestions.length : 0;
  const companySyncContext = `company_${name.toLowerCase()}`;
  
  const solvedQuestionsCount = useMemo(() => {
    if (!companyQuestions || !user || !user.solvedQuestions) return 0;
    return companyQuestions.filter((cq) => {
      const q = cq.question;
      if (!q) return false;
      return user.solvedQuestions.some((sq) => {
        const sqId = typeof sq.questionId === 'object' && sq.questionId !== null
          ? sq.questionId._id
          : sq.questionId;
        return sqId && sqId.toString() === q._id.toString() && (sq.syncContext || 'general') === companySyncContext;
      });
    }).length;
  }, [companyQuestions, user, companySyncContext]);

  const solvedPercentage = totalQuestionsCount > 0
    ? Math.round((solvedQuestionsCount / totalQuestionsCount) * 100)
    : 0;

  // Difficulty counts (calculated dynamically on timeframe selection)
  const diffCounts = useMemo(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    if (!companyQuestions) return counts;
    for (const cq of companyQuestions) {
      const q = cq.question;
      if (q && q.difficulty && counts[q.difficulty] !== undefined) {
        counts[q.difficulty] += 1;
      }
    }
    return counts;
  }, [companyQuestions]);

  // Average acceptance calculation
  const avgAcceptance = useMemo(() => {
    if (!companyQuestions || companyQuestions.length === 0) return '0%';
    let total = 0;
    let count = 0;
    for (const cq of companyQuestions) {
      const q = cq.question;
      if (q && q.acceptance) {
        const match = q.acceptance.match(/(\d+(\.\d+)?)/);
        if (match) {
          total += parseFloat(match[1]);
          count += 1;
        }
      }
    }
    return count > 0 ? `${(total / count).toFixed(1)}%` : '54.2%';
  }, [companyQuestions]);

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

  // Mark solved action
  const [solvingId, setSolvingId] = useState(null);
  const handleMarkSolved = async (questionId, title) => {
    if (!isAuthenticated || solvingId) return;
    setSolvingId(questionId);
    try {
      const response = await apiClient.post('/api/submissions/solve', {
        questionId,
        language: 'javascript',
        code: `// Solution for ${title} solved on CodePrep\n`,
        company: name || null,
        challenge: null,
        day: null,
        pattern: null,
        sheet: null,
        syncContext: companySyncContext,
      });

      if (response.data.success) {
        const profileRes = await apiClient.get('/api/auth/me');
        dispatch(setUser(profileRes.data));
        queryClient.invalidateQueries({ queryKey: ['companyQuestions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      console.error('Error marking question as solved:', err);
    } finally {
      setSolvingId(null);
    }
  };

  // Leetcode open problem link dispatcher
  const handleOpenProblem = (leetcodeLink) => {
    if (!leetcodeLink) return;
    const separator = leetcodeLink.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    if (name) params.set('company', name);
    const queryString = params.toString();
    const targetUrl = queryString
      ? `${leetcodeLink}${separator}${queryString}`
      : leetcodeLink;
    window.open(targetUrl, '_blank');
  };

  // Local matching questions filter
  const filteredQuestions = useMemo(() => {
    if (!companyQuestions) return [];
    const query = localSearch.toLowerCase().trim();
    if (!query) return companyQuestions;
    return companyQuestions.filter(cq => cq.question?.title?.toLowerCase().includes(query));
  }, [companyQuestions, localSearch]);

  const displayTitle = formatCompanyName(name);

  return (
    <div className="min-h-screen text-white antialiased" style={{ backgroundColor: '#0A0A0A' }}>
      <Sidebar />

      <div className="flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_W }}>
        {/* ════════════════════════════════════════════════════════════
            HERO HEADER
            ════════════════════════════════════════════════════════════ */}
        <header className="px-10 pt-10 pb-10" style={{ borderBottom: '1px solid #141414' }}>
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/dashboard/dsa')}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-[#4b5563] hover:text-[#fff] transition-colors bg-transparent border-none cursor-pointer"
            >
              <FaArrowLeft size={10} />
              Companies
            </button>
            <span style={{ color: '#2a2a2a' }}>/</span>
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>
              {displayTitle}
            </span>
          </div>

          {/* Large layout container */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-8">
            {/* Left title & badges */}
            <div className="flex-grow space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl"
                  style={{
                    backgroundColor: 'rgba(255,107,26,0.1)',
                    color: ORANGE,
                    border: '1px solid rgba(255,107,26,0.2)'
                  }}
                >
                  {displayTitle.charAt(0)}
                </div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-black leading-none tracking-tight text-white"
                    style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', letterSpacing: '-0.035em' }}
                  >
                    {displayTitle}
                  </motion.h1>
                  <p className="text-[13px] font-semibold mt-1" style={{ color: '#4b5563' }}>
                    TARGET INTERVIEW QUESTION BASE
                  </p>
                </div>
              </div>

              {/* Dynamic Difficulty Distribution pills */}
              {!isLoading && !isError && companyQuestions && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span
                    className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded border uppercase"
                    style={{ backgroundColor: 'rgba(34,197,94,0.06)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.15)' }}
                  >
                    {diffCounts.Easy} Easy
                  </span>
                  <span
                    className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded border uppercase"
                    style={{ backgroundColor: 'rgba(245,158,11,0.06)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.15)' }}
                  >
                    {diffCounts.Medium} Medium
                  </span>
                  <span
                    className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded border uppercase"
                    style={{ backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.15)' }}
                  >
                    {diffCounts.Hard} Hard
                  </span>
                </div>
              )}
            </div>

            {/* Right: Glass stats card */}
            {!isLoading && !isError && companyQuestions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1e1e1e',
                  boxShadow: '0 0 0 1px rgba(255,107,26,0.06), 0 20px 40px rgba(0,0,0,0.3)',
                  minWidth: '360px',
                }}
              >
                {/* Accent Top Border */}
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: ORANGE }} />

                <div className="px-7 py-6">
                  <div className="flex items-center gap-6 mb-5">
                    <div className="relative flex-shrink-0">
                      <CircularProgress pct={solvedPercentage} size={88} stroke={7} color={ORANGE} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-black text-white" style={{ fontSize: '18px', letterSpacing: '-0.04em' }}>
                          <AnimatedCounter value={solvedPercentage} />%
                        </span>
                        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
                          done
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-black text-white mb-0.5 text-sm" style={{ letterSpacing: '-0.01em' }}>
                        {solvedQuestionsCount === 0 ? 'Not started' : `${solvedQuestionsCount} solved in context`}
                      </p>
                      <p className="text-[12px]" style={{ color: '#6b7280' }}>
                        {totalQuestionsCount - solvedQuestionsCount} questions left for active profile
                      </p>
                    </div>
                  </div>

                  {/* Summary metric cells */}
                  <div
                    className="grid grid-cols-3 gap-y-2 gap-x-2"
                    style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
                        Questions
                      </span>
                      <span className="font-black text-white text-xl">
                        <AnimatedCounter value={totalQuestionsCount} />
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
                        Solved
                      </span>
                      <span className="font-black text-[#FF6B1A] text-xl">
                        <AnimatedCounter value={solvedQuestionsCount} />
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
                        Avg Accept
                      </span>
                      <span className="font-black text-white text-xl">
                        {avgAcceptance}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════
            FILTERS AND QUESTIONS LIST
            ════════════════════════════════════════════════════════════ */}
        <main className="flex-1 px-10 py-8 space-y-6">
          {/* Interactive Filters & Search bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 flex-1 min-w-[280px]"
              style={{
                backgroundColor: '#111111',
                border: '1px solid #1e1e1e',
                height: '46px'
              }}
            >
              <FaSearch size={13} style={{ color: '#4b5563' }} />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={`Search ${displayTitle} questions...`}
                className="bg-transparent flex-1 outline-none text-xs text-white placeholder-[#4b5563]"
              />
            </div>

            {/* Timeframe selector */}
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
                  className="whitespace-nowrap text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{
                    backgroundColor: timeframe === tab.value ? 'rgba(255,107,26,0.1)' : '#111111',
                    border: timeframe === tab.value ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                    color: timeframe === tab.value ? ORANGE : '#6b7280',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Difficulty filter chips */}
            <div className="flex items-center gap-1.5">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className="text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{
                    backgroundColor: difficulty === diff ? 'rgba(255,255,255,0.06)' : '#111111',
                    border: difficulty === diff ? '1px solid #333' : '1px solid #1e1e1e',
                    color: difficulty === diff ? '#fff' : '#6b7280',
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Loader state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FaSpinner className="animate-spin" size={24} style={{ color: ORANGE }} />
              <p className="text-[12px] text-gray-500 font-semibold">Resolving target questions...</p>
            </div>
          )}

          {/* Error fallback alert */}
          {!isLoading && isError && (
            <div
              className="p-6 rounded-2xl text-center max-w-lg mx-auto text-sm space-y-4"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <p className="text-red-400 font-bold">Failed to load company questions</p>
              <p className="text-gray-500 text-xs">{error?.message || 'Check connection details'}</p>
            </div>
          )}

          {/* Empty search matches */}
          {!isLoading && !isError && filteredQuestions.length === 0 && (
            <div
              className="text-center py-20 rounded-2xl"
              style={{ backgroundColor: '#111111', border: '1px dashed #1e1e1e', color: '#4b5563' }}
            >
              No questions matched the selected filters.
            </div>
          )}

          {/* Question cards list */}
          {!isLoading && !isError && filteredQuestions.length > 0 && (
            <div className="flex flex-col gap-3">
              {filteredQuestions.map((cq, idx) => {
                const q = cq.question;
                if (!q) return null;

                const isSolved = user?.solvedQuestions?.some((sq) => {
                  const sqId = typeof sq.questionId === 'object' && sq.questionId !== null
                    ? sq.questionId._id
                    : sq.questionId;
                  return sqId && sqId.toString() === q._id.toString() && (sq.syncContext || 'general') === companySyncContext;
                });

                const isBookmarked = user?.bookmarks?.some((b) => {
                  const bId = typeof b === 'object' && b?._id ? b._id : b;
                  return bId && bId.toString() === q._id.toString();
                });

                const diffStyle = DIFFICULTY_STYLE[q.difficulty] || DIFFICULTY_STYLE['Medium'];
                const freqPct = Math.min(100, Math.round((cq.frequency / maxFrequency) * 100));

                return (
                  <motion.div
                    key={cq._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx, 12) * 0.02 }}
                    className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl overflow-hidden transition-all duration-150"
                    style={{
                      backgroundColor: '#111111',
                      border: '1px solid #1e1e1e',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,107,26,0.3)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#1e1e1e';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Visual left rail line indicators */}
                    <div className="absolute top-0 bottom-0 left-0 w-[3px]" style={{ backgroundColor: isSolved ? '#22c55e' : 'transparent' }} />

                    {/* Question description details */}
                    <div className="flex items-center gap-4 flex-grow min-w-0">
                      {/* S.No label */}
                      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold bg-[#0d0d0d] border border-[#1c1c1c] text-[#4b5563]">
                        {String(idx + 1).padStart(2, '0')}
                      </div>

                      <div className="min-w-0 flex-grow space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm md:text-base leading-snug truncate ${isSolved ? 'line-through text-slate-500' : 'text-white'}`}>
                            {q.title}
                          </span>
                          <span
                            className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase border"
                            style={{
                              backgroundColor: diffStyle.bg,
                              color: diffStyle.color,
                              borderColor: diffStyle.border,
                            }}
                          >
                            {q.difficulty}
                          </span>
                        </div>

                        <div className="flex items-center gap-3.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-gray-500 font-mono">
                            Acceptance: <span className="text-gray-300 font-bold">{q.acceptance || 'N/A'}</span>
                          </span>

                          {/* Relative Frequency progress strip */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-gray-500 font-mono">Frequency:</span>
                            <div className="w-14 bg-white/5 rounded-full h-1 overflow-hidden">
                              <div className="bg-[#FF6B1A] h-full rounded-full" style={{ width: `${freqPct}%` }} />
                            </div>
                            <span className="text-[9px] font-semibold text-[#FF6B1A] font-mono">{(cq.frequency || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Action Buttons Group */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {/* Bookmark Icon */}
                      <button
                        onClick={() => handleBookmarkToggle(q._id, !!isBookmarked)}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-amber-400 hover:bg-white/10 transition cursor-pointer"
                        title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                      >
                        {isBookmarked ? <FaBookmark size={12} className="text-amber-400" /> : <FaRegBookmark size={12} />}
                      </button>

                      {/* Solve Indicator button */}
                      {isAuthenticated && (
                        <button
                          onClick={() => handleMarkSolved(q._id, q.title)}
                          disabled={solvingId === q._id || isSolved}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition duration-150 ${
                            isSolved
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 cursor-default'
                              : solvingId === q._id
                              ? 'bg-[#111] border-[#222] text-[#4b5563] cursor-wait'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer'
                          }`}
                        >
                          {solvingId === q._id ? (
                            <>
                              <FaSpinner className="animate-spin" size={10} />
                              <span>Syncing...</span>
                            </>
                          ) : isSolved ? (
                            <>
                              <FaCheckCircle size={10} />
                              <span>Solved</span>
                            </>
                          ) : (
                            <span>Mark Solved</span>
                          )}
                        </button>
                      )}

                      {/* Open LeetCode button */}
                      <button
                        onClick={() => handleOpenProblem(q.leetcodeUrl)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-black hover:opacity-90 transition cursor-pointer"
                        style={{ backgroundColor: ORANGE }}
                      >
                        Practice
                        <FaExternalLinkAlt size={10} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-5 flex items-center justify-between" style={{ borderTop: '1px solid #141414' }}>
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — Company Questions Practice
          </span>
        </footer>
      </div>
    </div>
  );
}
