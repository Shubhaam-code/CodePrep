import React, { useState, useMemo, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaClock as HistoryIcon,
  FaSearch as SearchIcon,
  FaGithub as GithubIcon,
  FaExternalLinkAlt as ExternalLinkIcon,
  FaBuilding as BuildingIcon,
  FaChevronDown as ChevronDownIcon,
  FaTrophy as TrophyIcon,
  FaFilter as FilterIcon,

} from 'react-icons/fa';
import { FaSpinner } from "react-icons/fa6";

import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';

// ─── Design tokens (match GVChallenge & GitHub Integration) ───────────────────
const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';

// Company logo accent color palette
const COMPANY_COLORS = {
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
  return COMPANY_COLORS[key] || '#FF6B1A';
};

const initialsFor = (raw = '') => {
  const cleaned = raw.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatDateShort = (dateVal) => {
  if (!dateVal) return '-';
  return new Date(dateVal).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

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
  if (dl === 'easy') return { bg: 'rgba(34,197,94,0.08)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' };
  if (dl === 'hard') return { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' };
  return { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' };
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];

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

// ─── Hero Stat Chip ───────────────────────────────────────────────────────────
function StatChip({ label, value, isText, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="flex flex-col rounded-xl px-5 py-4"
      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,107,26,0.2)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(255,107,26,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e1e1e';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        className="text-[9px] font-black tracking-widest uppercase mb-1"
        style={{ color: '#4b5563' }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span
          className="font-black truncate"
          style={{
            fontSize: isText ? '16px' : '22px',
            color: accent || '#fff',
            letterSpacing: '-0.04em',
          }}
          title={isText && value ? value : undefined}
        >
          {isText ? value : <AnimatedCounter value={value} />}
        </span>
      </div>
    </motion.div>
  );
}

// Compact details label row
function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider shrink-0 w-24">
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fetch company submissions timeline
  const {
    data: historyData,
    isLoading,
    isError,
    error: err,
    refetch,
  } = useQuery({
    queryKey: ['company-submission-history'],
    queryFn: async () => {
      const res = await apiClient.get('/api/submissions/history/company');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  // Project submissions into timeline entities
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
        runtime: s.runtime ?? null,
        memory: s.memory ?? null,
        syncContext: s.company ? `company_${s.company}` : null,
      }));
  }, [historyData]);

  // Alpha sorted distinct companies list for select dropdown
  const availableCompanies = useMemo(() => {
    const set = new Set();
    for (const item of timeline) {
      if (item.company) set.add(item.company);
    }
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [timeline]);

  // Client-side filter and sorting logic
  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = timeline.filter((item) => {
      if (q) {
        const title = (item.questionTitle || '').toLowerCase();
        if (!title.includes(q)) return false;
      }
      if (companyFilter !== 'All' && item.company !== companyFilter) return false;
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

  const hasAnySubmissions = timeline.length > 0;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    companyFilter !== 'All' ||
    difficultyFilter !== 'All';

  // Aggregate stats from the fetched timeline
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
        <header className="px-10 pt-10 pb-8" style={{ borderBottom: '1px solid #141414' }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <HistoryIcon size={12} style={{ color: ORANGE }} />
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
              Activity Logs
            </span>
          </div>

          {/* Title row */}
          <div className="space-y-2">
            <h1
              className="font-black leading-none tracking-tight"
              style={{ fontSize: 'clamp(34px, 3.5vw, 48px)', color: '#ffffff', letterSpacing: '-0.03em' }}
            >
              Activity
              <span style={{ color: ORANGE }}> History</span>
            </h1>
            <p className="text-base font-normal max-w-xl" style={{ color: '#6b7280', lineHeight: 1.6 }}>
              Track every solved interview question and monitor your preparation journey with automatic backup synchronizations.
            </p>
          </div>
        </header>

        {/* ── Page contents ── */}
        <main className="flex-1 px-10 py-8 space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <FaSpinner size={24} style={{ color: ORANGE }} className="animate-spin" />
              <p className="text-[13px] font-medium" style={{ color: '#4b5563' }}>Loading timeline activity logs…</p>
            </div>
          ) : isError ? (
            <div
              className="p-8 rounded-2xl text-center text-sm font-semibold"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
            >
              Failed to load submission history logs: {err?.message || 'Unknown error'}
            </div>
          ) : (
            <>
              {/* ── STATS ROW ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatChip label="Questions Solved" value={stats.totalQuestionsSolved} accent={ORANGE} delay={0.05} />
                <StatChip label="Companies Practiced" value={stats.totalCompaniesPracticed} delay={0.10} />
                <StatChip label="Most Practiced Company" value={stats.mostPracticedCompany} isText accent={ORANGE} delay={0.15} />
                <StatChip label="Today's Activity" value={stats.todaysSolvedCount} delay={0.20} />
              </div>

              {/* ── SEARCH & FILTERS CONTROLS ── */}
              <div
                className="rounded-2xl p-5 space-y-4 shadow-md select-none"
                style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
              >
                {/* Row 1: Search bar and Company filter */}
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Search */}
                  <div
                    className="flex items-center gap-3 rounded-xl px-4 transition-all duration-200 flex-1"
                    style={{
                      backgroundColor: '#0d0d0d',
                      border: isSearchFocused ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                      boxShadow: isSearchFocused ? `0 0 16px rgba(255,107,26,0.1)` : 'none',
                      height: '44px',
                    }}
                  >
                    <SearchIcon size={13} style={{ color: isSearchFocused ? ORANGE : '#4b5563', transition: 'color 0.2s' }} />
                    <input
                      type="text"
                      placeholder="Search by question title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="bg-transparent text-[13px] text-white placeholder-[#4b5563] outline-none w-full font-sans"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-[#4b5563] hover:text-[#9ca3af] transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Company Select filter */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
                      Company
                    </span>
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="cursor-pointer bg-[#0d0d0d] border border-[#1e1e1e] text-[12px] text-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#FF6B1A]/60 transition font-sans"
                    >
                      {availableCompanies.map((c) => (
                        <option key={c} value={c} className="bg-[#111111] text-gray-300">
                          {c === 'All' ? 'All companies' : c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Difficulty toggles and Sort toggles */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 border-t border-[#181818]">
                  {/* Difficulty options */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-400">
                    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>Difficulty:</span>
                    <div className="flex bg-[#0d0d0d] border border-[#1e1e1e] p-0.5 rounded-xl">
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setDifficultyFilter(opt)}
                          className="cursor-pointer px-3.5 py-1.5 text-[11px] rounded-lg transition-all duration-150 font-bold"
                          style={{
                            backgroundColor: difficultyFilter === opt ? 'rgba(255,107,26,0.12)' : 'transparent',
                            color: difficultyFilter === opt ? ORANGE : '#4b5563',
                            border: difficultyFilter === opt ? `1px solid ${ORANGE}30` : '1px solid transparent',
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort options */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-400">
                    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>Sort:</span>
                    <div className="flex bg-[#0d0d0d] border border-[#1e1e1e] p-0.5 rounded-xl">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSortBy(opt.value)}
                          className="cursor-pointer px-3.5 py-1.5 text-[11px] rounded-lg transition-all duration-150 font-bold"
                          style={{
                            backgroundColor: sortBy === opt.value ? 'rgba(255,107,26,0.12)' : 'transparent',
                            color: sortBy === opt.value ? ORANGE : '#4b5563',
                            border: sortBy === opt.value ? `1px solid ${ORANGE}30` : '1px solid transparent',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-tally line */}
                {hasAnySubmissions && (
                  <div className="text-[10px] text-gray-500 font-mono">
                    Showing <span className="text-white font-bold">{filteredHistory.length}</span> of {timeline.length} logs
                  </div>
                )}
              </div>

              {/* ── TIMELINE LIST ── */}
              {filteredHistory.length === 0 ? (
                <div
                  className="max-w-md mx-auto text-center py-16 rounded-2xl space-y-4"
                  style={{ backgroundColor: '#111111', border: '1px dashed #1e1e1e' }}
                >
                  <div className="text-4xl select-none">🗂️</div>
                  <div>
                    {hasAnySubmissions && hasActiveFilters ? (
                      <>
                        <h3 className="text-white font-bold text-sm mb-1">No matching logs found</h3>
                        <p className="text-[12px] max-w-xs mx-auto" style={{ color: '#4b5563' }}>
                          Try adjusting search query or active filters to view items.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-white font-bold text-sm mb-1">No company activities found</h3>
                        <p className="text-[12px] max-w-xs mx-auto" style={{ color: '#4b5563' }}>
                          Once you solve a company question via CodePrep, your synced solutions appear here.
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
                    className="absolute top-0 bottom-0 w-px hidden md:block"
                    style={{ left: '23px', backgroundColor: '#181818' }}
                  />

                  <ul className="space-y-4">
                    <AnimatePresence initial={false}>
                      {filteredHistory.map((item, idx) => {
                        const dc = diffBadge(item.difficulty);
                        const color = colorForCompany(item.company);
                        const initials = initialsFor(item.company);
                        const isExpanded = expandedIds.has(item.id);

                        return (
                          <motion.li
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.15) }}
                            className="relative md:pl-14"
                          >
                            {/* Rail node dot */}
                            <div
                              aria-hidden="true"
                              className="absolute top-5 left-[14px] hidden md:flex w-5 h-5 rounded-full items-center justify-center z-10"
                              style={{
                                backgroundColor: '#0A0A0A',
                                border: `2px solid ${color}`,
                                boxShadow: `0 0 0 3px rgba(255,255,255,0.02)`,
                              }}
                            />

                            {/* Card wrapper */}
                            <div
                              className="relative overflow-hidden flex flex-col rounded-2xl transition-all duration-200"
                              style={{
                                backgroundColor: '#111111',
                                border: '1px solid #1e1e1e',
                                borderLeft: `3px solid ${color}`,
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = `${color}40`;
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#1e1e1e';
                              }}
                            >
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
                                className="cursor-pointer w-full text-left flex items-start gap-4 p-5 outline-none focus:outline-none bg-transparent border-none"
                              >
                                {/* Company avatar badge */}
                                <div
                                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-[12px] tracking-wider select-none"
                                  style={{
                                    backgroundColor: `${color}15`,
                                    color,
                                    border: `1px solid ${color}35`,
                                  }}
                                >
                                  {initials}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Row 1: Company + Dates */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 uppercase"
                                      style={{
                                        backgroundColor: `${color}10`,
                                        color,
                                        borderColor: `${color}25`,
                                      }}
                                    >
                                      <BuildingIcon size={9} />
                                      {item.company}
                                    </span>
                                    <span className="text-[10px] font-mono" style={{ color: '#4b5563' }}>
                                      {formatDateShort(item.solvedAt)}
                                    </span>
                                    <span className="text-[10px] font-mono ml-auto" style={{ color: '#4b5563' }}>
                                      {timeAgo(item.solvedAt)}
                                    </span>
                                  </div>

                                  {/* Row 2: Title */}
                                  <p
                                    className="font-bold text-white text-[15px] mt-2.5 truncate"
                                    style={{ letterSpacing: '-0.01em' }}
                                  >
                                    {item.questionTitle}
                                  </p>

                                  {/* Row 3: Difficulty pill + Toggle chevron */}
                                  <div className="flex items-center gap-2 mt-2.5">
                                    {item.difficulty && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border"
                                        style={{ backgroundColor: dc.bg, color: dc.color, borderColor: dc.border }}
                                      >
                                        {item.difficulty}
                                      </span>
                                    )}
                                    <motion.span
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-lg text-gray-500 hover:text-white"
                                    >
                                      <ChevronDownIcon size={12} />
                                    </motion.span>
                                  </div>
                                </div>
                              </button>

                              {/* Expanded details shelf */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div
                                      className="px-5 pb-5 pt-3.5 border-t"
                                      style={{ borderColor: '#181818' }}
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                                        <DetailRow label="Language" value={item.language || '—'} />
                                        <DetailRow label="Runtime" value={item.runtime ? `${item.runtime}` : '—'} />
                                        <DetailRow label="Memory" value={item.memory ? `${item.memory}` : '—'} />
                                        <DetailRow label="Sync Context" value={item.syncContext || '—'} mono />
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 mt-5">
                                        <a
                                          href={item.githubUrl || undefined}
                                          target="_blank"
                                          rel="noreferrer"
                                          aria-disabled={!item.githubUrl}
                                          onClick={(e) => { if (!item.githubUrl) e.preventDefault(); }}
                                          className={`text-[11px] font-bold px-3 py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition duration-150 ${item.githubUrl
                                              ? 'cursor-pointer bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10'
                                              : 'bg-white/[0.02] text-gray-600 border border-white/5 cursor-not-allowed'
                                            }`}
                                        >
                                          <GithubIcon size={12} />
                                          GitHub Sync link
                                        </a>
                                        <a
                                          href={item.leetcodeUrl || undefined}
                                          target="_blank"
                                          rel="noreferrer"
                                          aria-disabled={!item.leetcodeUrl}
                                          onClick={(e) => { if (!item.leetcodeUrl) e.preventDefault(); }}
                                          className={`text-[11px] font-bold px-3 py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition duration-150 ${item.leetcodeUrl
                                              ? 'cursor-pointer bg-gradient-to-r from-[#FF6B1A] to-[#ff9a1a] text-white hover:opacity-95'
                                              : 'bg-white/[0.02] text-gray-600 border border-white/5 cursor-not-allowed'
                                            }`}
                                        >
                                          <ExternalLinkIcon size={12} />
                                          Open LeetCode
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
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-5 flex items-center justify-between" style={{ borderTop: '1px solid #141414' }}>
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — Submission Logs
          </span>
        </footer>
      </div>
    </div>
  );
}