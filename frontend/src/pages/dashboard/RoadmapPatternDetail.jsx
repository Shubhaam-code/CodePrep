import React, { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft as ArrowLeft,
  FaExternalLinkAlt as ExternalLink,
  FaCheckCircle as SolvedIcon,
  FaRegCircle as UnsolvedIcon,
  FaTrophy,
  FaFire,
  FaCalendar,
  FaBookOpen,
} from 'react-icons/fa';
import { Loader2 } from "lucide-react";
import Sidebar from '../../components/dashboard/Sidebar';
import apiClient from '../../api/axios';

const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';

// Pattern colors matching RoadmapList/Roadmap
const CATEGORY_COLORS = {
  arrays:           '#FF7A00',
  linked_list:      '#06B6D4',
  matrix:           '#A855F7',
  graph_traversal:  '#22C55E',
  binary_search:    '#EF4444',
  bit_manipulation: '#EAB308',
  heaps:            '#3B82F6',
  trees:            '#10B981',
  dynamic_programming: '#A855F7',
  graphs:           '#0EA5E9',
  greedy:           '#F59E0B',
  design:           '#EC4899',
};

const colorForCategory = (cat) => CATEGORY_COLORS[cat] || '#FF7A00';

const DIFFICULTY_STYLE = {
  Easy:   { bg: 'rgba(34,197,94,0.08)',   color: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  Medium: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  Hard:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
};

// ─── Animated Counter Component ───────────────────────────────────────────────
const AnimatedCounter = memo(function AnimatedCounter({ value, duration = 800 }) {
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
const CircularProgress = memo(function CircularProgress({ pct, size = 92, stroke = 7, color = ORANGE }) {
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

// ─── Hero Stat Chip ───────────────────────────────────────────────────────────
function StatChip({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-black text-xl" style={{ color: accent || '#fff', letterSpacing: '-0.04em' }}>
          <AnimatedCounter value={value} />
        </span>
      </div>
    </div>
  );
}

// ─── QuestionRowSkeleton (High fidelity shimmer loader) ───────────────────────
function QuestionRowSkeleton({ index }) {
  return (
    <div
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
        height: '82px',
      }}
    >
      <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-transparent" />
      <div className="flex items-center gap-4 flex-grow min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-lg shimmer-bg" />
        <div className="min-w-0 flex-grow space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1/3 rounded shimmer-bg" />
            <div className="h-4 w-12 rounded shimmer-bg" />
          </div>
          <div className="flex gap-1.5 pt-0.5">
            <div className="h-4.5 w-14 rounded shimmer-bg" />
            <div className="h-4.5 w-14 rounded shimmer-bg" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end">
        <div className="space-y-1.5 w-24">
          <div className="h-2 w-12 rounded shimmer-bg ml-auto" />
          <div className="h-1.5 w-full rounded shimmer-bg" />
        </div>
        <div className="w-8 h-8 rounded-lg shimmer-bg" />
        <div className="w-24 h-9 rounded-xl shimmer-bg" />
      </div>
    </div>
  );
}

// ─── Question Row Card ────────────────────────────────────────────────────────
const QuestionRowCard = memo(function QuestionRowCard({ question, order, solved, themeColor }) {
  const { title, difficulty, leetcodeUrl } = question;
  const hasUrl = typeof leetcodeUrl === 'string' && leetcodeUrl.trim().length > 0;
  const diffStyle = DIFFICULTY_STYLE[difficulty] || DIFFICULTY_STYLE['Medium'];

  // Mock estimated interview frequency and frequency label
  const frequency = useMemo(() => {
    const frequencies = ['Very High', 'High', 'Medium'];
    const idx = (title.charCodeAt(0) + order) % frequencies.length;
    return frequencies[idx];
  }, [title, order]);

  const freqBadgeStyle = useMemo(() => {
    if (frequency === 'Very High') return { color: '#FF6B1A', bg: 'rgba(255,107,26,0.1)', border: 'rgba(255,107,26,0.2)' };
    if (frequency === 'High') return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' };
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' };
  }, [frequency]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(order, 10) * 0.03, ease: 'easeOut' }}
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${themeColor}40`;
        e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.3), 0 0 0 1px ${themeColor}15`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e1e1e';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top micro border accent */}
      <div className="absolute top-0 inset-x-0 h-[1.5px]" style={{ backgroundColor: solved ? '#22c55e' : 'transparent' }} />

      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Number Badge */}
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-black border"
          style={{
            backgroundColor: '#0d0d0d',
            borderColor: '#1c1c1c',
            color: '#4b5563',
          }}
        >
          {String(order).padStart(2, '0')}
        </div>

        {/* Title & metadata */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm md:text-base leading-snug truncate">
              {title}
            </span>
            <span
              className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase border"
              style={{
                backgroundColor: diffStyle.bg,
                color: diffStyle.color,
                borderColor: diffStyle.border,
              }}
            >
              {difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Solved badge */}
            <span
              className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase"
              style={
                solved
                  ? { backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
                  : { backgroundColor: '#1a1a1a', color: '#4b5563', border: '1px solid #222' }
              }
            >
              {solved ? <SolvedIcon size={8} /> : <UnsolvedIcon size={8} />}
              {solved ? 'Solved' : 'Not Solved'}
            </span>

            {/* Frequency badge */}
            <span
              className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase border"
              style={{
                backgroundColor: freqBadgeStyle.bg,
                color: freqBadgeStyle.color,
                borderColor: freqBadgeStyle.border,
              }}
            >
              <FaFire size={7} /> Ask Freq: {frequency}
            </span>
          </div>
        </div>
      </div>

      {/* LeetCode link action */}
      {hasUrl ? (
        <a
          href={leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 text-[12px] font-bold px-4 py-2.5 rounded-xl text-white shadow-md transition-all duration-200"
          style={{
            backgroundColor: `${themeColor}12`,
            border: `1px solid ${themeColor}30`,
            color: themeColor,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = `${themeColor}22`;
            e.currentTarget.style.borderColor = `${themeColor}60`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = `${themeColor}12`;
            e.currentTarget.style.borderColor = `${themeColor}30`;
          }}
        >
          Open on LeetCode
          <ExternalLink size={10} />
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="shrink-0 inline-flex items-center justify-center gap-2 text-[12px] font-bold px-4 py-2.5 rounded-xl text-[#2a2a2a] border border-[#161616] bg-transparent cursor-not-allowed"
        >
          Link Unavailable
          <ExternalLink size={10} />
        </button>
      )}
    </motion.div>
  );
});

// ─── Main RoadmapPatternDetail Component ─────────────────────────────────────
export default function RoadmapPatternDetail() {
  const { patternId } = useParams();
  const navigate = useNavigate();

  // Resolve (category, pattern) from the roadmap list
  const {
    data: patterns = [],
    isLoading: isLoadingList,
    isError:   isErrorList,
    error:     errList,
    refetch:   refetchList,
  } = useQuery({
    queryKey: ['roadmap', 'list'],
    queryFn: () => apiClient.get('/api/roadmap').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const patternMeta = useMemo(
    () => patterns.find((p) => p.patternId === patternId) || null,
    [patterns, patternId]
  );
  const category = patternMeta?.roadmapCategory || null;
  const themeColor = colorForCategory(category);

  // Fetch questions for this category + pattern
  const {
    data: questionsData,
    isLoading: isLoadingQ,
    isError:   isErrorQ,
    error:     errQ,
    refetch:   refetchQ,
  } = useQuery({
    queryKey: ['roadmap', 'questions', category, patternId],
    queryFn: () => apiClient.get(
      `/api/roadmap/patterns/${encodeURIComponent(category)}/${encodeURIComponent(patternId)}/questions`
    ).then((r) => r.data),
    enabled: Boolean(category && patternId),
    staleTime: 60 * 1000,
  });

  const questions = useMemo(
    () => questionsData?.questions || [],
    [questionsData]
  );

  // Fetch detail list containing solved flags per user submission context
  const {
    data: detailData,
  } = useQuery({
    queryKey: ['roadmap', 'detail', patternId],
    queryFn: () => apiClient.get(
      `/api/roadmap/${encodeURIComponent(patternId)}`
    ).then((r) => r.data),
    enabled: Boolean(patternId),
    staleTime: 60 * 1000,
  });

  const solvedSet = useMemo(() => {
    const set = new Set();
    const list = detailData?.questions || [];
    for (const q of list) {
      if (q?.solved && q?._id) set.add(String(q._id));
    }
    return set;
  }, [detailData]);

  const totalCount = questions.length;
  const solvedCount = useMemo(() => {
    let n = 0;
    for (const q of questions) if (q?._id && solvedSet.has(String(q._id))) n += 1;
    return n;
  }, [questions, solvedSet]);

  const remainingCount = Math.max(0, totalCount - solvedCount);
  const completionPct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  const isLoading = isLoadingList || (category && isLoadingQ);
  const isError   = isErrorList || (category && isErrorQ);

  if (isError) {
    const message = errList?.response?.data?.message
      || errList?.message
      || errQ?.response?.data?.message
      || errQ?.message
      || 'Failed to load pattern details.';
    return (
      <div className="min-h-screen text-white antialiased" style={{ backgroundColor: '#0A0A0A' }}>
        <Sidebar />
        <main className="flex-1 px-10 py-16" style={{ marginLeft: SIDEBAR_W }}>
          <div
            className="p-8 rounded-2xl text-center text-sm font-semibold max-w-lg mx-auto space-y-4"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <p className="text-red-400">Couldn't load this pattern.</p>
            <p className="text-gray-500 text-xs">{message}</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  refetchList();
                  if (category) refetchQ();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#FF7A00]/15 border border-[#FF7A00]/30 text-[#FFB800] hover:bg-[#FF7A00]/25 transition cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/dashboard/roadmap')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#111111] border border-[#1e1e1e] text-white transition-opacity hover:opacity-90 cursor-pointer"
              >
                Back to Roadmap
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white antialiased"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <Sidebar />

      <div className="flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_W }}>
        {/* ════════════════════════════════════════════════════════════
            HERO HEADER
            ════════════════════════════════════════════════════════════ */}
        <header className="px-10 pt-10 pb-10" style={{ borderBottom: '1px solid #141414' }}>
          {/* Breadcrumb back navigation */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate('/dashboard/roadmap')}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-[#4b5563] hover:text-[#fff] transition-colors bg-transparent border-none cursor-pointer"
            >
              <ArrowLeft size={10} />
              Roadmap
            </button>
            <span style={{ color: '#2a2a2a' }}>/</span>
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: themeColor }}>
              {patternMeta?.patternName || patternId}
            </span>
          </div>

          {/* Title and stats layout */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-8">
            {/* Left description */}
            <div className="flex-1 space-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="font-black leading-none tracking-tight capitalize"
                style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)',
                  color: '#ffffff',
                  letterSpacing: '-0.03em',
                }}
              >
                {isLoadingList ? 'Loading Pattern…' : (patternMeta?.patternName || patternId)}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="text-[15px] font-normal max-w-lg"
                style={{ color: '#6b7280', lineHeight: 1.65 }}
              >
                Review key coding pattern questions. Click Open on LeetCode to practice. Your solutions sync automatically to GitHub.
              </motion.p>

              {/* Progress Slider */}
              {!isLoading && totalCount > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pt-2 max-w-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
                      Pattern Progress
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: themeColor }}>
                      {completionPct}% Complete
                    </span>
                  </div>
                  <div className="relative rounded-full overflow-hidden" style={{ height: 6, backgroundColor: '#1a1a1a' }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${themeColor}80, ${themeColor})`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Glass stats card */}
            {!isLoading && totalCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1e1e1e',
                  boxShadow: `0 0 0 1px ${themeColor}12, 0 20px 40px rgba(0,0,0,0.3)`,
                  minWidth: '360px',
                }}
              >
                {/* Top color accent */}
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: themeColor }} />

                <div className="px-7 py-6">
                  {/* Circular ring info */}
                  <div className="flex items-center gap-6 mb-5">
                    <div className="relative flex-shrink-0">
                      <CircularProgress pct={completionPct} size={88} stroke={7} color={themeColor} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-black text-white" style={{ fontSize: '18px', letterSpacing: '-0.04em' }}>
                          <AnimatedCounter value={completionPct} />%
                        </span>
                        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
                          done
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-black text-white mb-0.5 text-sm" style={{ letterSpacing: '-0.01em' }}>
                        {solvedCount === 0 ? 'Not yet started' : `${solvedCount} solved so far`}
                      </p>
                      <p className="text-[12px]" style={{ color: '#6b7280' }}>
                        {remainingCount} questions remaining to master pattern
                      </p>
                    </div>
                  </div>

                  {/* Summary metric cells */}
                  <div
                    className="grid grid-cols-3 gap-y-2 gap-x-2"
                    style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}
                  >
                    <StatChip label="Total Questions" value={totalCount} />
                    <StatChip label="Solved" value={solvedCount} accent={themeColor} />
                    <StatChip label="Remaining" value={remainingCount} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        <main className="flex-1 px-10 py-8">
          {isLoading && (
            <div className="relative w-full min-h-[300px]">
              <style>{`
                @keyframes shimmer {
                  0% {
                    background-position: -200% 0;
                  }
                  100% {
                    background-position: 200% 0;
                  }
                }
                .shimmer-bg {
                  background: linear-gradient(90deg, #18181b 25%, #27272a 50%, #18181b 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite linear;
                }
              `}</style>
              
              <div className="flex flex-col gap-3 opacity-45">
                {Array.from({ length: 6 }).map((_, i) => (
                  <QuestionRowSkeleton key={i} />
                ))}
              </div>

              {/* Centered Glassmorphic Loading Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0F]/30 backdrop-blur-[1.5px] z-20 pointer-events-none rounded-3xl">
                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 bg-[#0D0D12]/95 shadow-2xl gap-4">
                  <img
                    src="/imagecopy.png"
                    alt="CodePrep AI Logo"
                    className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,107,26,0.22)] animate-pulse"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-ping" />
                    <span className="text-xs font-bold tracking-wide text-white">
                      Preparing your practice session...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && totalCount === 0 && (
            <div
              className="text-center py-16 rounded-2xl"
              style={{ backgroundColor: '#111111', border: '1px dashed #1e1e1e', color: '#4b5563' }}
            >
              No questions found for this pattern in the database.
            </div>
          )}

          {!isLoading && totalCount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
                  Target Questions
                </span>
                <span className="text-[10px] font-black px-2.5 py-1 rounded bg-[#1a1a1a] text-[#4b5563]">
                  {totalCount} TOTAL
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {questions.map((q, i) => (
                  <QuestionRowCard
                    key={q._id}
                    question={q}
                    order={i + 1}
                    solved={solvedSet.has(String(q._id))}
                    themeColor={themeColor}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-5 flex items-center justify-between" style={{ borderTop: '1px solid #141414' }}>
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — Pattern Practice
          </span>
        </footer>
      </div>
    </div>
  );
}

// Simple fallback spinner icon
function FaSpinner({ className, size }) {
  return <Loader2 className={className} size={size} />;
}