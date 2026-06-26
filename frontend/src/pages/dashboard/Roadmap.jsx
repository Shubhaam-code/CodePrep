import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCodeBranch as RoadmapIcon,
  FaLock as LockIcon,
  FaUnlock as UnlockIcon,
  FaClock as ClockIcon,
  FaListUl as ListIcon,
  FaChevronRight as ChevronRight,
} from 'react-icons/fa';
import Sidebar from '../../components/dashboard/Sidebar';

// ──────────────────────────────────────────────────────────────────────────────
// Pattern Roadmap
//
// Replaces the old Topic-based roadmap with a NeetCode-style pattern
// hierarchy. Lock state is derived client-side: only the first
// pattern in display order is unlocked — the rest stay locked until
// backend progress tracking lands (out of scope for this task).
//
// No backend, no GitHub sync, no extension, no solve logic touched.
// ──────────────────────────────────────────────────────────────────────────────

const SIDEBAR_W = 224;

// Stable ordering — the entry at index 0 is the unlocked one.
const PATTERNS = [
  // Top-level group with nested sub-patterns.
  {
    id: 'arrays_hashing',
    name: 'Arrays & Hashing',
    icon: '🧮',
    color: '#FF7A00',
    totalQuestions: 10,
    estimatedMinutes: 90,
  },
  {
    id: 'two_pointers',
    name: 'Two Pointers',
    icon: '👉',
    color: '#FFB800',
    totalQuestions: 8,
    estimatedMinutes: 75,
    parent: 'arrays_hashing',
  },
  {
    id: 'sliding_window',
    name: 'Sliding Window',
    icon: '🪟',
    color: '#F59E0B',
    totalQuestions: 7,
    estimatedMinutes: 70,
    parent: 'arrays_hashing',
  },
  {
    id: 'binary_search',
    name: 'Binary Search',
    icon: '🎯',
    color: '#EF4444',
    totalQuestions: 9,
    estimatedMinutes: 85,
    parent: 'arrays_hashing',
  },
  {
    id: 'prefix_sum',
    name: 'Prefix Sum',
    icon: '➕',
    color: '#EC4899',
    totalQuestions: 5,
    estimatedMinutes: 45,
    parent: 'arrays_hashing',
  },

  // Top-level patterns.
  { id: 'linked_list',     name: 'Linked List',        icon: '🔗', color: '#06B6D4', totalQuestions: 8,  estimatedMinutes: 80  },
  { id: 'trees',           name: 'Trees',              icon: '🌳', color: '#22C55E', totalQuestions: 12, estimatedMinutes: 120 },
  { id: 'heap',            name: 'Heap',               icon: '🏔️', color: '#6366F1', totalQuestions: 6,  estimatedMinutes: 60  },
  { id: 'graph',           name: 'Graph',              icon: '🕸️', color: '#0EA5E9', totalQuestions: 9,  estimatedMinutes: 100 },
  { id: 'trie',            name: 'Trie',               icon: '🔤', color: '#14B8A6', totalQuestions: 4,  estimatedMinutes: 35  },
  { id: 'dynamic_programming', name: 'Dynamic Programming', icon: '⚡', color: '#A855F7', totalQuestions: 14, estimatedMinutes: 150 },

  // …room for future patterns.
];

// Format minutes as "Hh Mm" when ≥ 60, otherwise just "Mm min".
const formatEstimate = (mins) => {
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// Build a lookup so sub-patterns can find their parent card.
const patternById = new Map(PATTERNS.map((p) => [p.id, p]));

// Decide which patterns are unlocked. Per spec, only the first
// pattern in display order is unlocked.
const isUnlocked = (pattern, index) => index === 0;

export default function Roadmap() {
  // Tracks which pattern the user clicked. Used for visual feedback
  // only — the actual navigation to the Pattern Detail page is
  // handled by useNavigate() below.
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();

  // Top-level patterns drive the row order; sub-patterns hang off
  // their parent in `PATTERNS` so the rendered tree mirrors the spec.
  const topLevel = PATTERNS.filter((p) => !p.parent);

  const handlePatternClick = (pattern) => {
    setSelectedId(pattern.id);
    // Sub-patterns live under their parent in the data model; the
    // detail page is keyed on (category, pattern) so sub-patterns
    // navigate using the same slug pair they carry.
    const category = pattern.parent || pattern.id;
    navigate(`/dashboard/roadmap/pattern/${category}/${pattern.id}`);
  };

  const renderCard = (pattern, index, options = {}) => {
    const { indent = false, subIndex } = options;
    const unlocked = isUnlocked(pattern, index);
    const isSelected = selectedId === pattern.id;

    return (
      <motion.button
        key={pattern.id}
        type="button"
        onClick={() => unlocked && handlePatternClick(pattern)}
        disabled={!unlocked}
        whileHover={unlocked ? { y: -2 } : {}}
        aria-pressed={isSelected}
        aria-disabled={!unlocked}
        className={`group text-left w-full select-none ${
          unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
        style={{
          background: isSelected
            ? `${pattern.color}14`
            : 'var(--bg-card, #0F0F1A)',
          border: `1px solid ${
            isSelected ? pattern.color : 'var(--border, rgba(255,255,255,0.06))'
          }`,
          borderLeft: `3px solid ${pattern.color}`,
          borderRadius: '12px',
          padding: indent ? '14px 16px' : '18px 20px',
          opacity: unlocked ? 1 : 0.55,
          filter: unlocked ? 'none' : 'grayscale(0.4)',
        }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="shrink-0 rounded-lg flex items-center justify-center text-xl"
            style={{
              width: indent ? 36 : 44,
              height: indent ? 36 : 44,
              background: `${pattern.color}22`,
              border: `1px solid ${pattern.color}55`,
            }}
            aria-hidden="true"
          >
            {pattern.icon}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-bold ${
                  indent ? 'text-sm' : 'text-base'
                } truncate`}
                style={{ color: 'var(--text-1, #F1F5F9)' }}
              >
                {pattern.name}
              </h3>
              {!indent && (
                <span className="text-[10px] font-mono text-gray-500">
                  #{String(subIndex ?? index + 1).padStart(2, '0')}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-hover, rgba(255,255,255,0.04))',
                  color: 'var(--text-2, #CBD5E1)',
                  border: '1px solid var(--border, rgba(255,255,255,0.06))',
                }}
              >
                <ListIcon size={11} />
                {pattern.totalQuestions} questions
              </span>

              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-hover, rgba(255,255,255,0.04))',
                  color: 'var(--text-2, #CBD5E1)',
                  border: '1px solid var(--border, rgba(255,255,255,0.06))',
                }}
              >
                <ClockIcon size={11} />
                {formatEstimate(pattern.estimatedMinutes)}
              </span>

              {/* Locked / Unlocked badge */}
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                style={
                  unlocked
                    ? {
                        background: 'rgba(34,197,94,0.10)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }
                    : {
                        background: 'rgba(148,163,184,0.10)',
                        color: '#94a3b8',
                        border: '1px solid rgba(148,163,184,0.20)',
                      }
                }
              >
                {unlocked ? <UnlockIcon size={10} /> : <LockIcon size={10} />}
                {unlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
          </div>

          {/* Chevron (only when unlocked + selected) */}
          {unlocked && isSelected && (
            <ChevronRight
              size={14}
              className="shrink-0 self-center"
              style={{ color: pattern.color }}
            />
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-[#07070F] flex overflow-hidden">
      <Sidebar />

      <main
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{ marginLeft: SIDEBAR_W }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-30 shrink-0 px-6 py-4 flex items-center justify-between border-b"
          style={{
            background: 'rgba(7,7,15,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottomColor: 'var(--border, rgba(255,255,255,0.06))',
          }}
        >
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <RoadmapIcon size={18} className="text-[#FF7A00]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                DSA Pattern Roadmap
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3, #475569)' }}>
                Master patterns, unlock as you progress
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">
                Unlocked
              </span>
              <strong className="text-sm text-[#4ade80] font-mono">
                1 / {PATTERNS.length}
              </strong>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Intro */}
            <div className="mb-6">
              <h2 className="text-white font-bold text-xl">Pattern Roadmap</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3, #475569)' }}>
                Each pattern groups questions by the technique used to solve them.
                Solve the unlocked pattern to advance to the next one.
              </p>
            </div>

            {/* Pattern tree */}
            {topLevel.map((pattern, topIndex) => {
              // The first top-level card's "global" index in PATTERNS
              // drives the unlock check — sub-patterns share their
              // parent's unlock fate when sequential gating lands, but
              // for now everything except the very first pattern is
              // locked regardless.
              const globalIndex = PATTERNS.findIndex((p) => p.id === pattern.id);
              const children = PATTERNS
                .map((p, i) => ({ p, i }))
                .filter(({ p }) => p.parent === pattern.id);

              return (
                <div key={pattern.id} className="space-y-2">
                  {renderCard(pattern, globalIndex, { subIndex: topIndex + 1 })}

                  {/* Sub-patterns hang off the parent */}
                  {children.length > 0 && (
                    <div
                      className="ml-4 pl-4 border-l space-y-2"
                      style={{ borderColor: 'var(--border, rgba(255,255,255,0.06))' }}
                    >
                      {children.map(({ p, i }) => renderCard(p, i, { indent: true }))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer hint */}
            <div
              className="mt-8 text-center text-[11px] select-none"
              style={{ color: 'var(--text-3, #475569)' }}
            >
              More patterns coming soon.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}