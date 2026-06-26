import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FaArrowLeft as ArrowLeft,
  FaExternalLinkAlt as ExternalLink,
  FaCheckCircle as SolvedIcon,
  FaCircle as UnsolvedIcon,
} from 'react-icons/fa';
import Sidebar from '../../components/dashboard/Sidebar';
import apiClient from '../../api/axios';

const SIDEBAR_W = 224;

// Difficulty badge palette — kept identical to the rest of the
// dashboard so this page reads as one cohesive surface.
const DIFFICULTY_BADGE = {
  Easy:   { bg: 'bg-emerald-500/10', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  Medium: { bg: 'bg-amber-500/10',   color: 'text-amber-400',   dot: 'bg-amber-400'   },
  Hard:   { bg: 'bg-rose-500/10',    color: 'text-rose-400',    dot: 'bg-rose-400'    },
};

export default function RoadmapPatternDetail() {
  const { patternId } = useParams();
  const navigate = useNavigate();

  // ── Step 1: resolve (category, pattern) from the roadmap list ──
  // GET /api/roadmap returns one row per pattern with both the
  // patternId and its roadmapCategory. We look up the matching
  // entry in memory — the list is tiny (~22 rows).
  const {
    data: patterns = [],
    isLoading: isLoadingList,
    isError:   isErrorList,
    error:     errList,
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

  // ── Step 2: fetch questions for this (category, pattern) ────────
  // Disabled until we know the category — never fire a request with
  // a bogus /api/roadmap/patterns/undefined/.../questions URL.
  const {
    data: questionsData,
    isLoading: isLoadingQ,
    isError:   isErrorQ,
    error:     errQ,
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

  // ── Solved status (no progress logic, just per-row lookup) ──────
  // GET /api/roadmap/:patternId returns the same question list with
  // a `solved` flag per row. We build a Set<questionId> for an
  // O(1) lookup so the row render stays cheap. Fetched in parallel
  // with the question list and gated on the same condition.
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

  const isLoading = isLoadingList || (category && isLoadingQ);
  const isError   = isErrorList || (category && isErrorQ);

  if (isError) {
    const message = errList?.response?.data?.message
      || errList?.message
      || errQ?.response?.data?.message
      || errQ?.message
      || 'Failed to load pattern.';
    return (
      <div className="min-h-screen bg-[#07070F] flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
          <div className="p-8 text-center text-sm space-y-2">
            <p className="text-red-400">Couldn't load this pattern.</p>
            <p className="text-gray-500 text-xs">{message}</p>
            <Link
              to="/dashboard/roadmap"
              className="inline-block mt-3 px-4 py-1.5 text-xs font-bold rounded-lg bg-[#FF7A00]/15 border border-[#FF7A00]/30 text-[#FFB800] hover:bg-[#FF7A00]/25 transition"
            >
              Back to Roadmap
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard/roadmap')}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-[#FFB800] transition-colors"
              aria-label="Back to roadmap"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-bold text-lg truncate">
              {isLoadingList
                ? 'Loading…'
                : (patternMeta?.patternName || patternId)}
            </h1>
          </div>

          {/* Solved count chip — header-level summary only, no
              progress %, no progress bar (per Phase 6.2 spec). */}
          {!isLoading && totalCount > 0 && (
            <span
              className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(34,197,94,0.10)',
                color: '#4ade80',
                border: '1px solid rgba(34,197,94,0.25)',
              }}
              title="Solved count from your Submission history"
            >
              <SolvedIcon size={11} />
              {solvedCount} / {totalCount} solved
            </span>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Loading skeleton while we wait for the list lookup */}
            {isLoading && (
              <div className="text-center text-gray-500 text-sm py-16">
                Loading pattern…
              </div>
            )}

            {/* Empty / no-questions state */}
            {!isLoading && totalCount === 0 && (
              <div className="text-center text-gray-500 text-sm py-16 border border-dashed border-white/10 rounded-2xl">
                No questions tagged for this pattern yet.
              </div>
            )}

            {/* Question list */}
            {!isLoading && totalCount > 0 && (
              <div
                className="border rounded-2xl overflow-hidden shadow-xl"
                style={{
                  background: 'var(--bg-card, #0F0F1A)',
                  borderColor: 'var(--border, rgba(255,255,255,0.06))',
                }}
              >
                <ul
                  className="divide-y"
                  style={{ borderColor: 'var(--border, rgba(255,255,255,0.06))' }}
                >
                  {questions.map((q, i) => (
                    <QuestionRow
                      key={q._id}
                      question={q}
                      order={i + 1}
                      solved={solvedSet.has(String(q._id))}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// QuestionRow
//
// Single row in the pattern's question list. Five fields per spec:
//   • Order number          — 1-indexed position in the list
//   • Question title        — text, monospace, click-through disabled
//   • Difficulty            — colored pill (Easy / Medium / Hard)
//   • Solved status         — green check (or empty circle)
//   • LeetCode button       — opens leetcodeUrl in a new tab; disabled
//                             when the URL is missing.
//
// Phase 6.3 — the LeetCode button is the only interactive element
// that does anything. The title itself is intentionally NOT a link
// per spec ("Clicking question should NOT open LeetCode yet") so
// we render it as a plain <span>.
// ─────────────────────────────────────────────────────────────────────
function QuestionRow({ question, order, solved }) {
  const { title, difficulty, leetcodeUrl } = question;
  const diff = DIFFICULTY_BADGE[difficulty] || {
    bg: 'bg-slate-500/10',
    color: 'text-slate-400',
    dot: 'bg-slate-400',
  };
  const hasUrl = typeof leetcodeUrl === 'string' && leetcodeUrl.trim().length > 0;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(order, 12) * 0.02 }}
      className="flex items-center gap-4 p-4 md:p-5"
      style={{ borderColor: 'var(--border, rgba(255,255,255,0.06))' }}
    >
      {/* Order number */}
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
        style={{
          background: 'rgba(255,255,255,0.04)',
          color: '#94a3b8',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        aria-label={`Order ${order}`}
      >
        {String(order).padStart(2, '0')}
      </div>

      {/* Title + difficulty */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold text-sm truncate">
            {title}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${diff.bg} ${diff.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
            {difficulty}
          </span>
        </div>
      </div>

      {/* Solved status */}
      <div
        className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={
          solved
            ? {
                background: 'rgba(34,197,94,0.10)',
                color: '#4ade80',
                border: '1px solid rgba(34,197,94,0.25)',
              }
            : {
                background: 'rgba(148,163,184,0.06)',
                color: '#94a3b8',
                border: '1px solid rgba(148,163,184,0.18)',
              }
        }
        title={solved ? 'You have a submission for this question.' : 'No submission yet.'}
        aria-label={solved ? 'Solved' : 'Not solved'}
      >
        {solved ? <SolvedIcon size={10} /> : <UnsolvedIcon size={8} />}
        {solved ? 'Solved' : 'Not solved'}
      </div>

      {/* LeetCode button — Phase 6.3 */}
      {hasUrl ? (
        <a
          href={leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg text-black shadow-md shadow-[#FF7A00]/15 transition hover:opacity-90 cursor-pointer"
          style={{ background: '#FF7A00' }}
          aria-label={`Open ${title} on LeetCode`}
        >
          LeetCode
          <ExternalLink size={11} />
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg text-slate-500 border border-slate-800 cursor-not-allowed"
          style={{ background: 'rgba(15, 15, 26, 0.4)' }}
          title="LeetCode link unavailable for this question"
        >
          <ExternalLink size={11} />
          Unavailable
        </button>
      )}
    </motion.li>
  );
}