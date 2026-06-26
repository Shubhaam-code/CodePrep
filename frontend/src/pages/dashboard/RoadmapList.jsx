import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FaCodeBranch as RoadmapIcon,
  FaListUl as ListIcon,
  FaCheckCircle as CheckIcon,
  FaChevronRight as ChevronRight,
} from 'react-icons/fa';
import Sidebar from '../../components/dashboard/Sidebar';
import apiClient from '../../api/axios';

const SIDEBAR_W = 224;

// Number of skeleton cards to render while the roadmap list is in flight.
// Matches the visible grid (3 cols at lg) so the layout doesn't jump when
// real cards arrive — Phase 6.6 UX rule.
const SKELETON_COUNT = 6;

// Per-pattern accent — derived from roadmapCategory so the page
// stays visually varied without ever hardcoding a pattern name.
// Categories not listed fall back to the brand orange.
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

export default function RoadmapList() {
  const navigate = useNavigate();

  // Fetch the roadmap list. Phase 5.4 returns one row per pattern
  // with totalQuestions, solvedQuestions, and progress already
  // computed server-side — the page is just a presenter.
  //
  // Phase 6.5 — refetch on focus. Two layers of safety:
  //   1. refetchOnWindowFocus:true  — react-query fires when the
  //      tab regains focus AND the data is older than staleTime.
  //   2. The manual visibilitychange listener below covers the
  //      "user navigates away and comes back" path explicitly so
  //      spec wording ("page becomes active again") is satisfied
  //      even if react-query's focus event doesn't fire (e.g. on
  //      some browsers when navigating via in-app routing).
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

  // Phase 6.5 — explicit visibility-aware refetch. No polling, no
  // interval — only fires when the page transitions hidden → visible.
  // We don't refetch if the page is currently visible (initial mount)
  // because react-query already has the data; we only care about the
  // hidden → visible transition.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let wasHidden = document.visibilityState === 'hidden';
    const handleVisibility = () => {
      const isHidden = document.visibilityState === 'hidden';
      if (wasHidden && !isHidden) {
        // Page just became visible again — refetch so progress
        // reflects the user's latest activity elsewhere.
        refetch();
      }
      wasHidden = isHidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetch]);

  // Top-level summary stats for the header banner.
  const summary = React.useMemo(() => {
    let totalQ = 0;
    let solvedQ = 0;
    for (const p of patterns) {
      totalQ  += p.totalQuestions  || 0;
      solvedQ += p.solvedQuestions || 0;
    }
    const overall = totalQ === 0 ? 0 : Math.round((solvedQ / totalQ) * 100);
    return { totalQ, solvedQ, overall, count: patterns.length };
  }, [patterns]);

  return (
    <div className="min-h-screen bg-[#07070F] flex overflow-hidden">
      <Sidebar />

      <main
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{ marginLeft: SIDEBAR_W }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-30 shrink-0 px-6 py-4 flex items-center justify-between border-b select-none"
          style={{
            background: 'rgba(7,7,15,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottomColor: 'var(--border, rgba(255,255,255,0.06))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <RoadmapIcon size={18} className="text-[#FF7A00]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                DSA Pattern Roadmap
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                Pick a pattern to view its questions and track your progress.
              </p>
            </div>
          </div>

          {/* Overall progress chip (mirrors the dashboard header style) */}
          {!isLoading && !isError && patterns.length > 0 && (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">
                  Overall Progress
                </span>
                <strong className="text-sm text-[#FFB800] font-mono">
                  {summary.solvedQ} / {summary.totalQ} &nbsp;·&nbsp; {summary.overall}%
                </strong>
              </div>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Intro */}
            <div className="mb-2">
              <h2 className="text-white font-bold text-xl">All Patterns</h2>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>
                {summary.count} patterns · click any card to open the question list.
              </p>
            </div>

            {/* Loading skeleton grid — Phase 6.6.
                Matches the real card layout 1:1 so the grid doesn't
                shift when real data arrives. Animated pulse via
                Tailwind's animate-pulse (no JS timers). */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <PatternCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error state — Phase 6.6 with explicit retry button. */}
            {isError && (
              <div
                className="text-center text-sm py-16 space-y-3 border border-dashed border-red-500/20 rounded-2xl"
                style={{ background: 'rgba(239,68,68,0.04)' }}
              >
                <p className="text-red-400 font-semibold">Couldn't load the roadmap.</p>
                <p className="text-gray-500 text-xs max-w-md mx-auto">
                  {error?.response?.data?.message || error?.message || 'Unknown error.'}
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

            {/* Empty state — Phase 6.6. */}
            {!isLoading && !isError && patterns.length === 0 && (
              <div
                className="text-center text-sm py-16 space-y-2 border border-dashed border-white/10 rounded-2xl"
                style={{ background: 'var(--bg-card, #0F0F1A)' }}
              >
                <p className="text-gray-300 font-semibold">No patterns yet.</p>
                <p className="text-gray-500 text-xs max-w-md mx-auto">
                  The roadmap is empty. Patterns appear here once they're
                  configured in the backend.
                </p>
              </div>
            )}

            {/* Card grid */}
            {!isLoading && !isError && patterns.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PatternCard
//
// Single roadmap card. Visual style mirrors CompaniesPage so the
// dashboard reads as one cohesive surface. Click navigates to
// /roadmap/:patternId (Phase 6.2 — question list — is the next page).
// ─────────────────────────────────────────────────────────────────────
function PatternCard({ pattern, index, onClick }) {
  const {
    patternId,
    patternName,
    roadmapCategory,
    totalQuestions,
    solvedQuestions,
    progress,
  } = pattern;

  const color = colorForCategory(roadmapCategory);
  const safeTotal  = Number(totalQuestions)  || 0;
  const safeSolved = Number(solvedQuestions) || 0;
  const safePct    = Number(progress)        || 0;
  // The backend rounds progress already, but clamp here so a
  // floating-point edge case can never render a full bar at <100%
  // or an empty bar at >0%.
  const clampedPct = Math.max(0, Math.min(100, safePct));
  const isComplete = safeTotal > 0 && safeSolved >= safeTotal;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="group text-left w-full select-none cursor-pointer"
      style={{
        background: 'var(--bg-card, #0F0F1A)',
        border: '1px solid var(--border, rgba(255,255,255,0.06))',
        borderLeft: `3px solid ${color}`,
        borderRadius: '14px',
        padding: '18px 20px',
      }}
      aria-label={`Open ${patternName} pattern`}
    >
      {/* Header row: name + order chip */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-bold text-base leading-snug truncate group-hover:text-[#FFB800] transition-colors">
            {patternName}
          </h3>
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mt-1 truncate">
            {patternId}
          </p>
        </div>
        <span
          className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-md"
          style={{
            background: `${color}1A`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          #{String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Counts row */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: '#CBD5E1',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <ListIcon size={11} />
          {safeTotal} {safeTotal === 1 ? 'question' : 'questions'}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: isComplete
              ? 'rgba(34,197,94,0.10)'
              : 'rgba(255,255,255,0.04)',
            color: isComplete ? '#4ade80' : '#CBD5E1',
            border: `1px solid ${
              isComplete ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'
            }`,
          }}
        >
          <CheckIcon size={11} />
          {safeSolved} solved
        </span>
      </div>

      {/* Progress bar — same visual grammar as the company cards */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <span className="text-gray-500">Progress</span>
          <span style={{ color }}>{clampedPct}%</span>
        </div>
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedPct}%` }}
            transition={{ duration: 0.7, delay: index * 0.04 }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}90, ${color})`,
            }}
          />
        </div>
      </div>

      {/* Footer hint: chevron only on hover (no locked/unlocked logic yet) */}
      <div className="mt-4 flex items-center justify-end text-[10px] font-semibold text-gray-500 group-hover:text-[#FFB800] transition-colors">
        Open
        <ChevronRight size={12} className="ml-1 transition-transform group-hover:translate-x-0.5" />
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PatternCardSkeleton — Phase 6.6
//
// Loading-state placeholder for a PatternCard. Mirrors the real card's
// outer dimensions and internal slots (title row, two chip pills,
// progress bar, footer) so the grid stays the same shape when real
// data lands — no layout shift. Uses Tailwind's `animate-pulse` so we
// don't run any timers in JS; the animation is pure CSS.
// ─────────────────────────────────────────────────────────────────────
function PatternCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="select-none w-full"
      style={{
        background: 'var(--bg-card, #0F0F1A)',
        border: '1px solid var(--border, rgba(255,255,255,0.06))',
        borderLeft: '3px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '18px 20px',
      }}
    >
      {/* Title row + order chip */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
          <div className="h-2.5 w-1/3 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="shrink-0 h-4 w-8 rounded-md bg-white/5 animate-pulse" />
      </div>

      {/* Chips row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-20 rounded-full bg-white/5 animate-pulse" />
        <div className="h-5 w-16 rounded-full bg-white/5 animate-pulse" />
      </div>

      {/* Progress section */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <div className="h-2.5 w-12 rounded bg-white/5 animate-pulse" />
          <div className="h-2.5 w-8 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 animate-pulse" />
      </div>

      {/* Footer hint */}
      <div className="mt-4 flex justify-end">
        <div className="h-3 w-10 rounded bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}