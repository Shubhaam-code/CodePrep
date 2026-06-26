import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaClock as HistoryIcon,
  FaSearch as Search,
  FaGithub as Github,
  FaExternalLinkAlt as ExternalLink,
  FaBuilding as Building,
  FaChevronDown as ChevronDown,
} from 'react-icons/fa';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';


const SIDEBAR_W = 224;

// Brand palette reused from CompanyTracker so the company dot/avatar
// is consistent across the dashboard. Unknown companies fall back to
// the CodePrep orange.
const companyColors = {
  google: '#4285F4',
  amazon: '#FF9900',
  microsoft: '#00A4EF',
  meta: '#1877F2',
  apple: '#A2AAAD',
  netflix: '#E50914',
  adobe: '#FF0000',
  uber: '#FFFFFF',
  goldman_sachs: '#FFB800',
  atlassian: '#0052CC',
};

const colorForCompany = (raw = '') => {
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
  return companyColors[key] || '#FF7A00';
};

const initialsFor = (raw = '') => {
  const cleaned = raw.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function diffBadge(d = '') {
  const dl = d.toLowerCase();
  if (dl === 'easy')   return { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80', border: 'rgba(34,197,94,0.25)' };
  if (dl === 'hard')   return { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' };
  return                      { bg: 'rgba(234,179,8,0.1)',   color: '#fbbf24', border: 'rgba(234,179,8,0.25)' };
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];

// Compact label/value pair used inside an expanded history card.
function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider shrink-0 w-24">
        {label}
      </span>
      <span
        className={`text-xs text-gray-200 truncate ${mono ? 'font-mono' : ''}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// 4-up statistics header above the timeline. All values are derived
// client-side from the same timeline array the cards render, so the
// stats stay consistent if the user later refines the data source.
function StatsGrid({
  totalCompaniesPracticed,
  totalQuestionsSolved,
  mostPracticedCompany,
  todaysSolvedCount,
}) {
  const cards = [
    {
      label: 'Total Companies Practiced',
      value: totalCompaniesPracticed,
      accent: '#FF7A00',
    },
    {
      label: 'Total Questions Solved',
      value: totalQuestionsSolved,
      accent: '#FFB800',
    },
    {
      label: 'Most Practiced Company',
      value: mostPracticedCompany,
      accent: '#8B5CF6',
      isText: true,
    },
    {
      label: "Today's Solved Count",
      value: todaysSolvedCount,
      accent: '#4ade80',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-[#0D0D12]/80 border border-white/5 p-4 rounded-2xl shadow-lg"
        >
          <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block">
            {c.label}
          </span>
          <strong
            className={`mt-1 block ${
              c.isText ? 'text-base text-white' : 'text-2xl font-mono'
            } truncate`}
            style={{ color: c.isText ? c.accent : c.accent }}
            title={c.isText && c.value ? c.value : undefined}
          >
            {c.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function History() {
  // Filter / sort state — all client-side.
  const [searchQuery,    setSearchQuery]    = useState('');
  const [companyFilter,  setCompanyFilter]  = useState('All');     // 'All' or company name
  const [difficultyFilter, setDifficultyFilter] = useState('All'); // 'All' | 'Easy' | 'Medium' | 'Hard'
  const [sortBy,         setSortBy]         = useState('newest');  // 'newest' | 'oldest'
  // Track which timeline rows are expanded. Keyed by the row's stable
  // `id` so toggling survives filter/sort changes.
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // Fetch company submission history. Replaces the old
  // /api/gvchallenge/progress feed; the backend already filters out
  // gv_/pattern_/roadmap_/general syncContexts.
  const {
    data: historyData,
    isLoading,
    isError,
    error: err,
  } = useQuery({
    queryKey: ['company-submission-history'],
    queryFn: async () => {
      const res = await apiClient.get('/api/submissions/history/company');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const formatDateShort = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // ── Project backend rows into timeline entries ─────────────────────
  const timeline = useMemo(() => {
    return (historyData?.submissions || [])
      .map((s, idx) => ({
        id: `${s.questionTitle || 'q'}-${s.solvedAt || idx}-${idx}`,
        questionTitle: s.questionTitle,
        company: s.company,
        difficulty: s.difficulty,
        language: s.language,
        solvedAt: s.solvedAt ? new Date(s.solvedAt) : null,
        githubSynced: !!s.githubSynced,
        githubUrl: s.githubUrl || null,
        leetcodeUrl: s.leetcodeUrl || null,
        // Backend does not yet surface runtime/memory/syncContext on
        // the history endpoint. syncContext is derivable here
        // (every row came from a company_* sync); runtime + memory
        // stay null until the backend grows those fields.
        runtime: s.runtime ?? null,
        memory:  s.memory  ?? null,
        syncContext: s.company ? `company_${s.company}` : null,
      }));
  }, [historyData]);

  // Distinct companies present in the data, sorted alphabetically.
  // Recomputed only when the underlying timeline changes — not on
  // every keystroke.
  const availableCompanies = useMemo(() => {
    const set = new Set();
    for (const item of timeline) {
      if (item.company) set.add(item.company);
    }
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [timeline]);

  // ── Filter + sort (all client-side) ───────────────────────────────
  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = timeline.filter((item) => {
      // Title search
      if (q) {
        const title = (item.questionTitle || '').toLowerCase();
        if (!title.includes(q)) return false;
      }
      // Company filter
      if (companyFilter !== 'All' && item.company !== companyFilter) return false;
      // Difficulty filter
      if (
        difficultyFilter !== 'All' &&
        (item.difficulty || '').toLowerCase() !== difficultyFilter.toLowerCase()
      ) return false;
      return true;
    });

    const dir = sortBy === 'oldest' ? 1 : -1;
    filtered.sort((a, b) => {
      const ta = a.solvedAt ? a.solvedAt.getTime() : 0;
      const tb = b.solvedAt ? b.solvedAt.getTime() : 0;
      return (ta - tb) * dir;
    });

    return filtered;
  }, [timeline, searchQuery, companyFilter, difficultyFilter, sortBy]);

  // ── Empty-state copy adapts to the active filters ────────────────
  const hasAnySubmissions = timeline.length > 0;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    companyFilter !== 'All' ||
    difficultyFilter !== 'All';

  // ── Company statistics (client-side, derived from `timeline`) ─────
  // Single pass over the timeline: tally company counts and today's
  // solved count. Doing this in one loop avoids re-scanning for each
  // stat card.
  const stats = useMemo(() => {
    const companyCounts = new Map();
    let todaysSolved = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of timeline) {
      if (item.company) {
        companyCounts.set(item.company, (companyCounts.get(item.company) || 0) + 1);
      }
      if (item.solvedAt) {
        const solvedDay = new Date(item.solvedAt);
        solvedDay.setHours(0, 0, 0, 0);
        if (solvedDay.getTime() === today.getTime()) todaysSolved += 1;
      }
    }

    let mostPracticed = '—';
    let mostCount = 0;
    for (const [name, count] of companyCounts) {
      if (count > mostCount) {
        mostCount = count;
        mostPracticed = name;
      }
    }

    return {
      totalCompaniesPracticed: companyCounts.size,
      totalQuestionsSolved: timeline.length,
      mostPracticedCompany: mostPracticed,
      todaysSolvedCount: todaysSolved,
    };
  }, [timeline]);

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
        <ErrorMessage message={err?.message || 'Failed to load history.'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-12" style={{ marginLeft: SIDEBAR_W }}>

        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-white font-bold text-lg flex items-center gap-2 select-none">
              <HistoryIcon size={18} className="text-[#FF7A00]" />
              Activity History
            </h1>
            <p className="text-gray-500 text-xs select-none">Your company submission timeline</p>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* COMPANY STATISTICS HEADER */}
          <StatsGrid
            totalCompaniesPracticed={stats.totalCompaniesPracticed}
            totalQuestionsSolved={stats.totalQuestionsSolved}
            mostPracticedCompany={stats.mostPracticedCompany}
            todaysSolvedCount={stats.todaysSolvedCount}
          />

          {/* SEARCH + FILTERS + SORT */}
          <div className="bg-[#0D0D12] border border-white/5 p-4 rounded-2xl flex flex-col gap-4 shadow-lg select-none">
            {/* Row 1: title search + company dropdown */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 w-full md:max-w-xs">
                <Search size={14} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by question title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="company-filter"
                  className="text-[10px] uppercase font-bold text-gray-500 tracking-wider"
                >
                  Company
                </label>
                <select
                  id="company-filter"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="cursor-pointer bg-black border border-white/8 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FF7A00]/60 transition font-sans"
                >
                  {availableCompanies.map((c) => (
                    <option key={c} value={c} className="bg-[#0D0D12] text-gray-300">
                      {c === 'All' ? 'All companies' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: difficulty chips + sort */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <span>Difficulty:</span>
                <div className="flex bg-black border border-white/5 p-0.5 rounded-lg">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setDifficultyFilter(opt)}
                      className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${
                        difficultyFilter === opt ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <span>Sort:</span>
                <div className="flex bg-black border border-white/5 p-0.5 rounded-lg">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`cursor-pointer px-2.5 py-1 text-[10px] rounded-md transition ${
                        sortBy === opt.value ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result count */}
            {hasAnySubmissions && (
              <div className="text-[10px] text-gray-500 font-mono">
                Showing {filteredHistory.length} of {timeline.length}
              </div>
            )}
          </div>

          {/* TIMELINE */}
          {filteredHistory.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-20 bg-[#0D0D12]/20 border border-dashed border-white/10 p-8 rounded-3xl space-y-5">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-gray-500">
                <HistoryIcon size={28} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                {hasAnySubmissions && hasActiveFilters ? (
                  <>
                    <h3 className="text-white font-bold text-base">No matches</h3>
                    <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto">
                      Try adjusting your search or filters.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-white font-bold text-base">No company submissions yet.</h3>
                    <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto">
                      Once you solve a company-tagged question, it will appear here.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline rail */}
              <div
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-px bg-white/5 hidden md:block"
                style={{ left: '23px' }}
              />

              <ul className="space-y-4">
                <AnimatePresence initial={false}>
                  {filteredHistory.map((item, idx) => {
                    const dc = diffBadge(item.difficulty);
                    const color = colorForCompany(item.company);
                    const initials = initialsFor(item.company);

                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                        className="relative md:pl-14"
                      >
                        {/* Company dot on the rail (desktop only) */}
                        <div
                          aria-hidden="true"
                          className="absolute top-5 left-[14px] hidden md:flex w-5 h-5 rounded-full items-center justify-center"
                          style={{
                            background: '#0B0B0F',
                            border: `2px solid ${color}`,
                            boxShadow: `0 0 0 4px rgba(255,255,255,0.02)`,
                          }}
                        />

                        <div
                          className="relative overflow-hidden flex flex-col"
                          style={{
                            background: 'var(--bg-card, #0F0F1A)',
                            border: '1px solid var(--border, rgba(255,255,255,0.06))',
                            borderLeft: `3px solid ${color}`,
                            borderRadius: '12px',
                            padding: '16px',
                          }}
                        >
                          {/* Header — clickable to toggle expansion. */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                            aria-expanded={expandedIds.has(item.id)}
                            aria-controls={`history-details-${item.id}`}
                            className="cursor-pointer w-full text-left flex items-start gap-3 outline-none focus-visible:ring-1 focus-visible:ring-[#FF7A00]/60 rounded-md"
                          >
                            {/* Company avatar */}
                            <div
                              className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-[11px] tracking-wider select-none"
                              style={{
                                background: `${color}22`,
                                color,
                                border: `1px solid ${color}55`,
                              }}
                              title={item.company}
                            >
                              {initials}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Row 1: Company + time */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1"
                                  style={{
                                    background: `${color}1A`,
                                    color,
                                    borderColor: `${color}55`,
                                  }}
                                >
                                  <Building size={10} />
                                  {item.company}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {formatDateShort(item.solvedAt)}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono ml-auto">
                                  {timeAgo(item.solvedAt)}
                                </span>
                              </div>

                              {/* Row 2: Question title */}
                              <p className="font-semibold text-sm mt-1.5 truncate" style={{ color: 'var(--text-1, #f3f4f6)' }}>
                                {item.questionTitle}
                              </p>

                              {/* Row 3: Difficulty + chevron */}
                              <div className="flex items-center gap-2 mt-2">
                                {item.difficulty && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                                    style={{ background: dc.bg, color: dc.color, borderColor: dc.border }}
                                  >
                                    {item.difficulty}
                                  </span>
                                )}
                                <motion.span
                                  animate={{ rotate: expandedIds.has(item.id) ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-md text-gray-500 hover:text-white"
                                >
                                  <ChevronDown size={12} />
                                </motion.span>
                              </div>
                            </div>
                          </button>

                          {/* Expanded details */}
                          <AnimatePresence initial={false}>
                            {expandedIds.has(item.id) && (
                              <motion.div
                                id={`history-details-${item.id}`}
                                key="details"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="mt-4 pt-3 border-t"
                                  style={{ borderColor: 'var(--border, rgba(255,255,255,0.06))' }}
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                                    <DetailRow label="Language" value={item.language || '—'} />
                                    <DetailRow label="Runtime"  value={item.runtime ? `${item.runtime}` : '—'} />
                                    <DetailRow label="Memory"   value={item.memory  ? `${item.memory}`  : '—'} />
                                    <DetailRow label="Sync Context" value={item.syncContext || '—'} mono />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    <a
                                      href={item.githubUrl || undefined}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-disabled={!item.githubUrl}
                                      onClick={(e) => { if (!item.githubUrl) e.preventDefault(); }}
                                      className={`text-[11px] font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition ${
                                        item.githubUrl
                                          ? 'cursor-pointer bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10'
                                          : 'bg-white/[0.02] text-gray-600 border border-white/5 cursor-not-allowed'
                                      }`}
                                    >
                                      <Github size={12} />
                                      GitHub link
                                    </a>
                                    <a
                                      href={item.leetcodeUrl || undefined}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-disabled={!item.leetcodeUrl}
                                      onClick={(e) => { if (!item.leetcodeUrl) e.preventDefault(); }}
                                      className={`text-[11px] font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition ${
                                        item.leetcodeUrl
                                          ? 'cursor-pointer bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black hover:opacity-95'
                                          : 'bg-white/[0.02] text-gray-600 border border-white/5 cursor-not-allowed'
                                      }`}
                                    >
                                      <ExternalLink size={12} />
                                      LeetCode link
                                    </a>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}