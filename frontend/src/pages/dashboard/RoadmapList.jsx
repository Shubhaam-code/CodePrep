import React, { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCodeBranch as RoadmapIcon,
  FaLock as LockIcon,
  FaArrowRight as ArrowRight,
  FaClock as ClockIcon,
  FaTrophy,
  FaFire,
  FaCheckCircle,
  FaSpinner,
} from 'react-icons/fa';
import Sidebar from '../../components/dashboard/Sidebar';
import apiClient from '../../api/axios';

// ─── Design tokens (match GVChallenge & GitHub Integration) ───────────────────
const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';

// SKELETON_COUNT to avoid layout jumps during loading
const SKELETON_COUNT = 6;

// Per-category default color map
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

// Rich metadata mapping for the patterns
const PATTERN_METADATA = {
  arrays_hashing: {
    icon: '🧮',
    description: 'Foundation of every interview. Master O(1) lookups with hash maps.',
    frequency: 'Very High',
    difficulty: 'Easy',
  },
  two_pointers: {
    icon: '👉',
    description: 'Reduce O(n²) brute force to O(n) by moving two indices inward.',
    frequency: 'High',
    difficulty: 'Easy',
  },
  sliding_window: {
    icon: '🪟',
    description: 'Process subarrays in linear time using an expandable window.',
    frequency: 'High',
    difficulty: 'Medium',
  },
  binary_search: {
    icon: '🎯',
    description: 'Halve the search space every step. Goes far beyond sorted arrays.',
    frequency: 'High',
    difficulty: 'Medium',
  },
  prefix_sum: {
    icon: '➕',
    description: 'Precompute cumulative sums for instant range-query answers.',
    frequency: 'Medium',
    difficulty: 'Easy',
  },
  linked_list: {
    icon: '🔗',
    description: 'Pointer manipulation, reversal, cycle detection and merging.',
    frequency: 'Medium',
    difficulty: 'Medium',
  },
  trees: {
    icon: '🌳',
    description: 'DFS, BFS, BST operations, LCA and tree construction problems.',
    frequency: 'Very High',
    difficulty: 'Medium',
  },
  heap: {
    icon: '🏔️',
    description: 'Efficiently track k-th largest, streaming medians and merges.',
    frequency: 'Medium',
    difficulty: 'Medium',
  },
  graph: {
    icon: '🕸️',
    description: 'BFS/DFS, union-find, topological sort, shortest path algorithms.',
    frequency: 'High',
    difficulty: 'Hard',
  },
  trie: {
    icon: '🔤',
    description: 'Prefix-tree for fast string search, autocomplete and XOR tricks.',
    frequency: 'Low',
    difficulty: 'Medium',
  },
  dynamic_programming: {
    icon: '⚡',
    description: 'Break hard problems into overlapping subproblems. The interview finale.',
    frequency: 'Very High',
    difficulty: 'Hard',
  }
};

const getPatternMeta = (patternId, category) => {
  const normId = String(patternId).toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (PATTERN_METADATA[normId]) return PATTERN_METADATA[normId];
  return {
    icon: '🔤',
    description: 'Master this key coding pattern with structured practice questions.',
    frequency: 'Medium',
    difficulty: 'Medium',
  };
};

const FREQ_STYLES = {
  'Very High': { color: '#FF6B1A', bg: 'rgba(255,107,26,0.1)', border: 'rgba(255,107,26,0.25)' },
  'High':      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
  'Medium':    { color: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)' },
  'Low':       { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.25)' },
};

const DIFF_STYLES = {
  'Easy':   { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)' },
  'Medium': { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  'Hard':   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
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

// ─── Gradient Progress Bar ────────────────────────────────────────────────────
const GradientBar = memo(function GradientBar({ pct, color, delay = 0 }) {
  return (
    <div className="relative rounded-full overflow-hidden" style={{ height: 5, backgroundColor: '#1a1a1a' }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: pct > 0 ? `linear-gradient(90deg, ${color}90, ${color})` : 'transparent',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay }}
      />
    </div>
  );
});

// ─── Hero Stat Chip ───────────────────────────────────────────────────────────
function StatChip({ label, value, sub, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-black" style={{ fontSize: '20px', color: accent || '#fff', letterSpacing: '-0.04em' }}>
          <AnimatedCounter value={value} />
        </span>
        {sub && (
          <span className="text-[11px] font-medium" style={{ color: '#4b5563' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PatternCard (Main presenter component) ──────────────────────────────────
const PatternCard = memo(function PatternCard({ pattern, index, onClick }) {
  const {
    patternId,
    patternName,
    roadmapCategory,
    totalQuestions,
    solvedQuestions,
    progress,
  } = pattern;

  const color = colorForCategory(roadmapCategory);
  const meta = getPatternMeta(patternId, roadmapCategory);
  const freqStyle = FREQ_STYLES[meta.frequency] || FREQ_STYLES['Low'];
  const diffStyle = DIFF_STYLES[meta.difficulty] || DIFF_STYLES['Medium'];
  const clampedPct = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: 'easeOut' }}
      className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s, background-color 0.2s',
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.borderColor = `${color}45`;
        el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${color}22`;
        el.style.transform = 'translateY(-3px)';
        el.style.backgroundColor = `${color}06`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.borderColor = '#1e1e1e';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        el.style.transform = 'translateY(0)';
        el.style.backgroundColor = '#111111';
      }}
    >
      {/* Top color accent bar */}
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: color }} />

      {/* Card body */}
      <div className="flex flex-col h-full p-5 pt-6 gap-4">
        {/* Header row: icon + frequency badge */}
        <div className="flex items-start justify-between">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              backgroundColor: `${color}18`,
              border: `1px solid ${color}35`,
            }}
          >
            {meta.icon}
          </div>
          <span
            className="flex items-center gap-1 text-[9px] font-black tracking-widest px-2 py-1 rounded-lg uppercase"
            style={{
              backgroundColor: freqStyle.bg,
              color: freqStyle.color,
              border: `1px solid ${freqStyle.border}`,
            }}
          >
            <FaFire size={7} /> {meta.frequency}
          </span>
        </div>

        {/* Name + description */}
        <div className="flex-1">
          <h3
            className="font-black leading-tight mb-1.5"
            style={{
              fontSize: '15px',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            {patternName}
          </h3>
          <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#6b7280' }}>
            {meta.description}
          </p>
        </div>

        {/* Meta pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-lg"
            style={{ backgroundColor: '#1a1a1a', color: '#4b5563', border: '1px solid #202020' }}
          >
            {totalQuestions}Q
          </span>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{
              backgroundColor: diffStyle.bg,
              color: diffStyle.color,
              border: `1px solid ${diffStyle.border}`,
            }}
          >
            {meta.difficulty}
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] border border-[#222] text-[#4b5563] ml-auto"
          >
            #{String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold" style={{ color: '#4b5563' }}>
              {solvedQuestions || 0} / {totalQuestions} solved
            </span>
            <span className="text-[10px] font-black" style={{ color: clampedPct > 0 ? color : '#2a2a2a' }}>
              {clampedPct}%
            </span>
          </div>
          <GradientBar pct={clampedPct} color={color} delay={index * 0.04 + 0.15} />
        </div>

        {/* CTA Open Button */}
        <button
          className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-[12px] transition-all duration-200"
          style={{
            backgroundColor: `${color}12`,
            border: `1px solid ${color}30`,
            color,
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = `${color}22`;
            e.currentTarget.style.borderColor = `${color}60`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = `${color}12`;
            e.currentTarget.style.borderColor = `${color}30`;
          }}
        >
          Open Pattern
          <ArrowRight size={11} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
});

// ─── PatternCardSkeleton (Pulse loader) ───────────────────────────────────────
function PatternCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
        minHeight: '280px',
      }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px] bg-white/5" />
      <div className="flex flex-col h-full p-5 pt-6 gap-4">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl shimmer-bg" />
          <div className="h-5 w-16 rounded-lg shimmer-bg" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded shimmer-bg" />
          <div className="h-2.5 w-1/2 rounded shimmer-bg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-10 rounded shimmer-bg" />
          <div className="h-5 w-12 rounded shimmer-bg" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-1/3 shimmer-bg rounded" />
          <div className="h-1.5 w-full shimmer-bg rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Main RoadmapList Component ───────────────────────────────────────────────
export default function RoadmapList() {
  const navigate = useNavigate();

  // Fetch patterns dynamically from API
  const {
    data: patterns = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['roadmap', 'list'],
    queryFn: () => apiClient.get('/api/roadmap').then((r) => r.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Automatically refetch when tab gains focus
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let wasHidden = document.visibilityState === 'hidden';
    const handleVisibility = () => {
      const isHidden = document.visibilityState === 'hidden';
      if (wasHidden && !isHidden) {
        refetch();
      }
      wasHidden = isHidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetch]);

  // Aggregate stats dynamically
  const summary = useMemo(() => {
    let totalQ = 0;
    let solvedQ = 0;
    let completedCount = 0;
    for (const p of patterns) {
      const t = p.totalQuestions || 0;
      const s = p.solvedQuestions || 0;
      totalQ  += t;
      solvedQ += s;
      if (t > 0 && s >= t) {
        completedCount++;
      }
    }
    const overall = totalQ === 0 ? 0 : Math.round((solvedQ / totalQ) * 100);
    return { totalQ, solvedQ, overall, count: patterns.length, completedCount };
  }, [patterns]);

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
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7">
            <RoadmapIcon size={12} style={{ color: ORANGE }} />
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
              DSA Pattern Roadmap
            </span>
          </div>

          {/* Title + Stats Glass card layout */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-8">
            {/* Left description */}
            <div className="flex-1 space-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="font-black leading-none tracking-tight"
                style={{
                  fontSize: 'clamp(36px, 3.8vw, 52px)',
                  color: '#ffffff',
                  letterSpacing: '-0.035em',
                }}
              >
                DSA Pattern
                <span style={{ color: ORANGE }}> Roadmap</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="text-[15px] font-normal max-w-lg"
                style={{ color: '#6b7280', lineHeight: 1.65 }}
              >
                Master the most important coding interview patterns and track your progress. Click any card to view detailed questions.
              </motion.p>

              {/* Overall Progress slide-up bar */}
              {!isLoading && !isError && patterns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pt-2 max-w-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
                      Overall Progress
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: ORANGE }}>
                      {summary.overall}% Complete
                    </span>
                  </div>
                  <div className="relative rounded-full overflow-hidden" style={{ height: 6, backgroundColor: '#1a1a1a' }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${ORANGE}80, ${ORANGE})`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${summary.overall}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Glass stats card */}
            {!isLoading && !isError && patterns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1e1e1e',
                  boxShadow: '0 0 0 1px rgba(255,107,26,0.06), 0 20px 40px rgba(0,0,0,0.3)',
                  minWidth: '380px',
                }}
              >
                {/* Top color border accent */}
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: ORANGE }} />

                <div className="px-7 py-6">
                  {/* Circular progress & status */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative flex-shrink-0">
                      <CircularProgress pct={summary.overall} size={92} stroke={7} color={ORANGE} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-black text-white" style={{ fontSize: '20px', letterSpacing: '-0.04em' }}>
                          <AnimatedCounter value={summary.overall} />%
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
                          done
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-black text-white mb-0.5" style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>
                        {summary.solvedQ === 0 ? 'Just getting started' : `${summary.solvedQ} solved so far`}
                      </p>
                      <p className="text-[12px]" style={{ color: '#6b7280' }}>
                        {summary.totalQ - summary.solvedQ} questions remaining across all patterns
                      </p>
                    </div>
                  </div>

                  {/* 5-value dashboard summary stats */}
                  <div
                    className="grid grid-cols-3 gap-y-5 gap-x-2"
                    style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px' }}
                  >
                    <StatChip label="Total Questions" value={summary.totalQ} />
                    <StatChip label="Questions Solved" value={summary.solvedQ} accent={ORANGE} />
                    <StatChip label="Patterns Completed" value={`${summary.completedCount}/${patterns.length}`} />
                    <StatChip label="Overall Progress" value={`${summary.overall}%`} />
                    <StatChip label="Completion Percentage" value={`${summary.overall}%`} accent={ORANGE} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════
            PATTERN LIST GRID
            ════════════════════════════════════════════════════════════ */}
        <main className="flex-1 px-10 py-8">
          {/* List title & count badges */}
          {!isLoading && !isError && (
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="font-black text-white" style={{ fontSize: '20px', letterSpacing: '-0.03em' }}>
                  All Patterns
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: '#4b5563' }}>
                  Click a card to drill down and review individual questions.
                </p>
              </div>
              <span
                className="text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase"
                style={{ backgroundColor: '#1a1a1a', color: '#6b7280', border: '1px solid #222' }}
              >
                {patterns.length} PATTERNS TOTAL
              </span>
            </div>
          )}

          {/* Skeleton loader */}
          {isLoading && (
            <div className="relative w-full min-h-[400px]">
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 opacity-40">
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <PatternCardSkeleton key={i} />
                ))}
              </div>

              {/* Centered Glassmorphic Loading Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0F]/45 backdrop-blur-[2px] z-20 pointer-events-none rounded-3xl">
                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 bg-[#0D0D12]/95 shadow-2xl gap-4">
                  <img
                    src="/imagecopy.png"
                    alt="CodePrep AI Logo"
                    className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,107,26,0.22)] animate-pulse"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-ping" />
                    <span className="text-xs font-bold tracking-wide text-white">
                      Loading DSA Patterns...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error presenter */}
          {isError && (
            <div
              className="text-center text-sm py-16 space-y-3 border border-dashed border-red-500/20 rounded-2xl"
              style={{ background: 'rgba(239,68,68,0.04)' }}
            >
              <p className="text-red-400 font-semibold">Couldn't load the roadmap.</p>
              <p className="text-gray-500 text-xs max-w-md mx-auto">
                {error?.response?.data?.message || error?.message || 'Error communicating with server.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#FF7A00]/15 border border-[#FF7A00]/30 text-[#FFB800] hover:bg-[#FF7A00]/25 transition inline-flex items-center gap-1.5"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && patterns.length === 0 && (
            <div
              className="text-center text-sm py-16 space-y-2 border border-dashed border-white/10 rounded-2xl"
              style={{ backgroundColor: '#111111' }}
            >
              <p className="text-gray-300 font-semibold">No patterns found</p>
              <p className="text-gray-500 text-xs max-w-md mx-auto">
                There are no coding patterns configured in the database yet.
              </p>
            </div>
          )}

          {/* Real data 3-column grid */}
          {!isLoading && !isError && patterns.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {patterns.map((p, i) => (
                <PatternCard
                  key={p.patternId}
                  pattern={p}
                  index={i}
                  onClick={() => navigate(`/roadmap/${p.patternId}`)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-5 flex items-center justify-between" style={{ borderTop: '1px solid #141414' }}>
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — DSA Roadmap
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#2a2a2a' }}>
            <FaTrophy size={10} style={{ color: ORANGE }} />
            Solve questions inside patterns to level up progress
          </div>
        </footer>
      </div>
    </div>
  );
}