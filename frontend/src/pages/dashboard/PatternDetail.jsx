import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FaCodeBranch as RoadmapIcon,
  FaArrowLeft as ArrowLeft,
  FaExternalLinkAlt as ExternalLink,
  FaCheckCircle as CheckCircle,
  FaCheck as Check,
  FaClock as ClockIcon,
  FaListUl as ListIcon,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const SIDEBAR_W = 224;

// Difficulty badge palette — kept identical to TopicQuestions so the
// two pages look consistent.
const DIFFICULTY_BADGE = {
  Easy:   { bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
  Medium: { bg: 'bg-amber-500/10',   color: 'text-amber-400' },
  Hard:   { bg: 'bg-rose-500/10',   color: 'text-rose-400' },
};

// Pretty-print minutes: <60 → "Mm min", ≥60 → "Hh Mm".
function formatEstimate(mins) {
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Pretty-print the category slug for the header chip.
// "arrays_hashing" → "Arrays & Hashing" — falls back to the raw
// string if no mapping is found.
const CATEGORY_PRETTY = {
  arrays_hashing: 'Arrays & Hashing',
  linked_list: 'Linked List',
  trees: 'Trees',
  heap: 'Heap',
  graph: 'Graph',
  trie: 'Trie',
  dynamic_programming: 'Dynamic Programming',
};
function prettyCategory(slug = '') {
  if (CATEGORY_PRETTY[slug]) return CATEGORY_PRETTY[slug];
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PatternDetail() {
  const { category, pattern } = useParams();

  // UI-only solved state — keyed by question id. Per the spec we are
  // NOT wiring this to the backend, NOT touching the submission flow,
  // and NOT touching GitHub sync. A click flips the local badge.
  const [locallySolvedIds, setLocallySolvedIds] = useState(() => new Set());

  const toggleLocalSolved = (id) => {
    setLocallySolvedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Pattern metadata (description, estimatedTime, …) ─────────────
  // GET /api/roadmap/patterns → find the matching row. Returns one
  // doc per RoadmapPattern; we filter in memory because the list is
  // tiny and this avoids a new endpoint.
  const { data: patternsData, isLoading: isLoadingMeta, isError: isErrorMeta, error: errMeta } = useQuery({
    queryKey: ['roadmap-patterns'],
    queryFn: async () => {
      const res = await apiClient.get('/api/roadmap/patterns');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const patternMeta = (patternsData?.patterns || []).find(
    (p) => p.category === category && p.pattern === pattern
  );

  // ── Question list for this pattern ───────────────────────────────
  const { data: questionsData, isLoading: isLoadingQ, isError: isErrorQ, error: errQ } = useQuery({
    queryKey: ['roadmap-pattern-questions', category, pattern],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/roadmap/patterns/${encodeURIComponent(category)}/${encodeURIComponent(pattern)}/questions`
      );
      return res.data;
    },
    enabled: Boolean(category && pattern),
    staleTime: 60 * 1000,
  });

  const questions = questionsData?.questions || [];

  // Progress is hardcoded 0/X per spec — UI-only. The locally-toggled
  // badges exist for visual feedback but do not feed the count.
  const totalCount = questions.length;
  const solvedCount = 0;

  const isLoading = isLoadingMeta || isLoadingQ;
  const isError   = isErrorMeta || isErrorQ;

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
        <ErrorMessage message={errMeta?.message || errQ?.message || 'Failed to load pattern.'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <Link
            to="/dashboard/roadmap"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-300 transition mb-2"
          >
            <ArrowLeft size={12} /> Back to Roadmap
          </Link>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
              <RoadmapIcon size={18} className="text-[#FF7A00]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight">
                {patternMeta?.pattern
                  ? patternMeta.pattern.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  : (pattern || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </h1>
              <p className="text-xs mt-0.5 text-gray-500">
                {prettyCategory(category)} · Pattern Roadmap
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Pattern summary card */}
          <div
            className="border rounded-2xl p-5"
            style={{
              background: 'var(--bg-card, #0F0F1A)',
              borderColor: 'var(--border, rgba(255,255,255,0.06))',
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Category chip */}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg border"
                style={{
                  background: 'rgba(255,122,0,0.10)',
                  color: '#FF7A00',
                  borderColor: 'rgba(255,122,0,0.30)',
                }}
              >
                {prettyCategory(category)}
              </span>

              {/* Estimated time */}
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-hover, rgba(255,255,255,0.04))',
                  color: 'var(--text-2, #CBD5E1)',
                  border: '1px solid var(--border, rgba(255,255,255,0.06))',
                }}
              >
                <ClockIcon size={11} />
                {formatEstimate(patternMeta?.estimatedTime)}
              </span>

              {/* Total questions */}
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-hover, rgba(255,255,255,0.04))',
                  color: 'var(--text-2, #CBD5E1)',
                  border: '1px solid var(--border, rgba(255,255,255,0.06))',
                }}
              >
                <ListIcon size={11} />
                {totalCount} {totalCount === 1 ? 'question' : 'questions'}
              </span>

              {/* Progress */}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                style={{
                  background: 'rgba(139,92,246,0.10)',
                  color: '#A78BFA',
                  border: '1px solid rgba(139,92,246,0.30)',
                }}
                title="Solved count is UI-only for now"
              >
                {solvedCount} / {totalCount} solved
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mt-4 leading-relaxed">
              {patternMeta?.description || 'Practice questions for this pattern.'}
            </p>
          </div>

          {/* Question list */}
          {questions.length === 0 ? (
            <div className="text-center py-16 bg-[#0D0D12]/20 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
              No questions tagged for this pattern yet.
            </div>
          ) : (
            <div
              className="border rounded-2xl overflow-hidden shadow-xl"
              style={{
                background: 'var(--bg-card, #0F0F1A)',
                borderColor: 'var(--border, rgba(255,255,255,0.06))',
              }}
            >
              <ul className="divide-y" style={{ borderColor: 'var(--border, rgba(255,255,255,0.06))' }}>
                {questions.map((q) => {
                  const diff = DIFFICULTY_BADGE[q.difficulty] || {
                    bg: 'bg-slate-500/10',
                    color: 'text-slate-400',
                  };
                  const isLocallySolved = locallySolvedIds.has(q._id);

                  return (
                    <motion.li
                      key={q._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5"
                      style={{
                        borderColor: 'var(--border, rgba(255,255,255,0.06))',
                      }}
                    >
                      {/* Left: title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`font-bold text-sm truncate ${
                              isLocallySolved ? 'line-through text-gray-500' : 'text-white'
                            }`}
                          >
                            {q.title}
                          </h3>

                          {/* Difficulty badge */}
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${diff.bg} ${diff.color}`}
                          >
                            {q.difficulty}
                          </span>

                          {/* Solved badge (UI-only) */}
                          {isLocallySolved && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(34,197,94,0.10)',
                                color: '#4ADE80',
                                border: '1px solid rgba(34,197,94,0.25)',
                              }}
                              title="UI only — not synced to the backend"
                            >
                              <CheckCircle size={10} />
                              Solved
                            </span>
                          )}
                        </div>

                        {q.acceptance && (
                          <p className="text-[10px] text-gray-500 font-mono mt-1">
                            Acceptance {q.acceptance}
                          </p>
                        )}
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Open Problem — links to the Question's own
                            leetcodeUrl field. No context params are
                            appended; this page is intentionally
                            decoupled from the GitHub-sync flow. */}
                        {q.leetcodeUrl ? (
                          <a
                            href={`${(q.leetcodeUrl || '').replace(/\/$/, '')}/?pattern=${pattern}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer text-[11px] font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 text-white shadow-md shadow-[#FF7A00]/15 transition hover:opacity-90"
                            style={{ background: '#FF7A00' }}
                          >
                            Open Problem
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <button
                            disabled
                            className="cursor-not-allowed text-[11px] font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 text-slate-500 border border-slate-800"
                            style={{ background: 'rgba(15, 15, 26, 0.4)' }}
                          >
                            Link Unavailable
                          </button>
                        )}

                        {/* Mark Solved — UI only. No backend call,
                            no submission write, no GitHub sync. */}
                        <button
                          type="button"
                          onClick={() => toggleLocalSolved(q._id)}
                          aria-pressed={isLocallySolved}
                          className={`cursor-pointer text-[11px] font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition ${
                            isLocallySolved
                              ? 'border border-emerald-500/40'
                              : 'border border-white/10'
                          }`}
                          style={{
                            background: isLocallySolved
                              ? 'rgba(34,197,94,0.10)'
                              : 'rgba(255,255,255,0.02)',
                            color: isLocallySolved ? '#4ADE80' : '#E2E8F0',
                          }}
                          title="UI only — does not save to the backend"
                        >
                          {isLocallySolved ? (
                            <>
                              <Check size={11} /> Solved
                            </>
                          ) : (
                            <>Mark Solved</>
                          )}
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}