/**
 * DSAPractice.jsx — Performance-optimised rewrite
 *
 * Mirrors all optimisations applied to CompaniesPage.jsx:
 *  1. Removed unused imports (FaCheckCircle, FaArrowRight, FaSpinner).
 *  2. Shared utils from companyUtils.js — no redefined constants.
 *  3. buildSolvedMap → O(1) solved-count lookup per card.
 *  4. isFocused moved into CompanySearchBar → no grid re-render on focus.
 *  5. visible slice memoised.
 *  6. Inline <style> shimmer removed — now in index.css.
 *  7. CompanyGrid + CompanyChip replace CompanyCard (no framer-motion per card).
 *  8. CompanySearchBar replaces inline toolbar.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FaBuilding, FaTrophy } from 'react-icons/fa';
import Sidebar from '../../components/dashboard/Sidebar';
import apiClient from '../../api/axios';
import { useAppSelector } from '../../store/store';
import { CompanyGrid }     from '../../components/company/CompanyGrid';
import { CompanySearchBar } from '../../components/company/CompanySearchBar';
import {
  ORANGE, SIDEBAR_W, PAGE_SIZE,
  matchesFilter, buildSolvedMap,
} from '../../utils/companyUtils';

// ─── Sub-components (stable, module-level) ────────────────────────────────────

function AnimatedCounter({ value }) {
  const [display, setDisplay] = React.useState('0');
  React.useEffect(() => {
    const target = Number(String(value).match(/^\d+/)?.[0] ?? 0);
    const suffix = String(value).replace(/^\d+/, '');
    if (target === 0) { setDisplay(`0${suffix}`); return; }
    const start = performance.now();
    const dur   = 800;
    const tick  = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const e = p * (2 - p);
      setDisplay(`${Math.floor(e * target)}${suffix}`);
      if (p < 1) requestAnimationFrame(tick);
      else setDisplay(`${target}${suffix}`);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{display}</span>;
}

const CircularProgress = React.memo(function CircularProgress({ pct, size = 92, stroke = 7 }) {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={ORANGE} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: off }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
      />
    </svg>
  );
});

const ProgressBar = React.memo(function ProgressBar({ pct }) {
  return (
    <div className="relative rounded-full overflow-hidden" style={{ height: 6, backgroundColor: '#1a1a1a' }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, ${ORANGE}80, ${ORANGE})` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
      />
    </div>
  );
});

function StatChip({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
        {label}
      </span>
      <span className="font-black text-xl" style={{ color: accent || '#fff', letterSpacing: '-0.04em' }}>
        <AnimatedCounter value={value} />
      </span>
    </div>
  );
}

function CompanyCardSkeleton() {
  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden p-5 pt-6 gap-4"
      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', height: '252px' }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px] bg-white/5" />
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl shimmer-bg" />
        <div className="h-6 w-16 rounded-lg shimmer-bg" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded shimmer-bg" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-12 rounded-md shimmer-bg" />
          <div className="h-5 w-12 rounded-md shimmer-bg" />
          <div className="h-5 w-12 rounded-md shimmer-bg" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-1/3 rounded shimmer-bg" />
        <div className="h-1.5 w-full rounded shimmer-bg" />
      </div>
      <div className="h-9 w-full rounded-xl shimmer-bg" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DSAPractice() {
  const navigate = useNavigate();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter,    setActiveFilter]    = useState('all');
  const [sortDir,         setSortDir]         = useState('asc');
  const [visibleCount,    setVisibleCount]    = useState(PAGE_SIZE);

  const { user } = useAppSelector((state) => state.auth);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const { data: companiesMeta, isLoading, isError, refetch } = useQuery({
    queryKey: ['companies-meta'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/companies/meta');
        return res.data;
      } catch {
        const res = await apiClient.get('/api/companies');
        return (res.data || []).map(name => ({ name, questionCount: 15, topTags: [] }));
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // ── O(1) solved-count Map ─────────────────────────────────────────────────
  const solvedMap = useMemo(
    () => buildSolvedMap(user?.solvedQuestions),
    [user?.solvedQuestions]
  );

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!companiesMeta) return [];
    const q = debouncedSearch.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    let list = companiesMeta;
    if (q) {
      list = list.filter(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q));
    }
    if (activeFilter !== 'all') {
      list = list.filter(c => matchesFilter(c.name, activeFilter));
    }
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [companiesMeta, debouncedSearch, activeFilter, sortDir]);

  // ── Memoised visible slice ────────────────────────────────────────────────
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!companiesMeta) return { totalQuestions: 0, totalSolved: 0, pct: 0 };
    let totalQ = 0, totalS = 0;
    for (const c of companiesMeta) {
      totalQ += Number(c.questionCount) || 0;
      totalS += solvedMap.get(c.name.toLowerCase()) ?? 0;
    }
    return { totalQuestions: totalQ, totalSolved: totalS, pct: totalQ > 0 ? Math.round((totalS / totalQ) * 100) : 0 };
  }, [companiesMeta, solvedMap]);

  const totalCount = companiesMeta?.length ?? 0;
  const hasMore    = visibleCount < filtered.length;

  // ── Stable callbacks ──────────────────────────────────────────────────────
  const handleSearchChange = useCallback((val) => {
    setDebouncedSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const handleFilterChange = useCallback((id) => {
    setActiveFilter(id);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const handleSortChange = useCallback((dir) => setSortDir(dir), []);
  const handleLoadMore   = useCallback(() => setVisibleCount(v => v + PAGE_SIZE), []);

  return (
    <div className="min-h-screen text-white antialiased" style={{ backgroundColor: '#0A0A0A' }}>
      <Sidebar />

      <div className="flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_W }}>

        {/* ── HERO HEADER ─────────────────────────────────────────────── */}
        <header className="px-10 pt-10 pb-10" style={{ borderBottom: '1px solid #141414' }}>
          <div className="flex items-center gap-2 mb-7">
            <FaBuilding size={12} style={{ color: ORANGE }} />
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
              Company Preparation
            </span>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-8">
            {/* Left */}
            <div className="flex-1 space-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="font-black leading-none tracking-tight"
                style={{ fontSize: 'clamp(36px, 3.8vw, 52px)', color: '#ffffff', letterSpacing: '-0.035em' }}
              >
                Company<span style={{ color: ORANGE }}> Questions</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="text-[15px] font-normal max-w-lg"
                style={{ color: '#6b7280', lineHeight: 1.65 }}
              >
                Practice the most frequently asked interview questions from top companies. Filter by category, search names, and track your metrics.
              </motion.p>

              {!isLoading && !isError && companiesMeta && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="pt-2 max-w-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>Overall Progress</span>
                    <span className="text-[11px] font-bold" style={{ color: ORANGE }}>{summary.pct}% Complete</span>
                  </div>
                  <ProgressBar pct={summary.pct} />
                </motion.div>
              )}
            </div>

            {/* Right: Glass stats card */}
            {!isLoading && !isError && companiesMeta && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1e1e1e',
                  boxShadow: '0 0 0 1px rgba(255,107,26,0.06), 0 20px 40px rgba(0,0,0,0.3)',
                  minWidth: '380px',
                }}
              >
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: ORANGE }} />
                <div className="px-7 py-6">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative flex-shrink-0">
                      <CircularProgress pct={summary.pct} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-black text-white" style={{ fontSize: '20px', letterSpacing: '-0.04em' }}>
                          <AnimatedCounter value={summary.pct} />%
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>done</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-black text-white mb-0.5" style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>
                        {summary.totalSolved === 0 ? 'Just getting started' : `${summary.totalSolved} solved so far`}
                      </p>
                      <p className="text-[12px]" style={{ color: '#6b7280' }}>
                        {summary.totalQuestions - summary.totalSolved} questions remaining across all tech entities
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-y-5 gap-x-2" style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px' }}>
                    <StatChip label="Total Companies" value={totalCount} />
                    <StatChip label="Questions"       value={summary.totalQuestions} />
                    <StatChip label="Solved"          value={summary.totalSolved} accent={ORANGE} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        {/* ── SEARCH, FILTERS, GRID ────────────────────────────────────── */}
        <main className="flex-1 px-10 py-8 space-y-6">

          {/* Isolated search bar — focus state is local, grid never re-renders from it */}
          <CompanySearchBar
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            activeFilter={activeFilter}
            sortDir={sortDir}
          />

          {/* Loading skeletons */}
          {isLoading && (
            <div className="relative w-full min-h-[400px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-40">
                {Array.from({ length: 12 }, (_, i) => <CompanyCardSkeleton key={i} />)}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0F]/40 backdrop-blur-[2px] z-20 pointer-events-none rounded-3xl">
                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 bg-[#0D0D12]/95 shadow-2xl gap-4">
                  <img src="/imagecopy.png" alt="CodePrep AI Logo" className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,107,26,0.22)] animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-ping" />
                    <span className="text-xs font-bold tracking-wide text-white">Loading Company Questions...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="text-center py-16 rounded-2xl space-y-4" style={{ border: '1px dashed #1e1e1e', color: '#6b7280' }}>
              <p className="text-[16px] font-bold text-white mb-1">Failed to load company questions</p>
              <p className="text-[13px]">There was an error communicating with the server. Please check your internet connection.</p>
              <button
                type="button" onClick={() => refetch()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#FF7A00]/15 border border-[#FF7A00]/30 text-[#FFB800] hover:bg-[#FF7A00]/25 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4 select-none">🔍</div>
              <p className="text-white text-[17px] font-bold mb-1">No matches found</p>
              <p className="text-[13px]" style={{ color: '#4b5563' }}>
                {debouncedSearch ? 'No companies found with that query.' : 'No matches found in the selected category.'}
              </p>
            </div>
          )}

          {/* Virtualised company grid */}
          {!isLoading && !isError && visible.length > 0 && (
            <>
              <CompanyGrid items={visible} solvedMap={solvedMap} />

              <div className="flex flex-col items-center gap-3 pt-6">
                <p className="text-[13px]" style={{ color: '#4b5563' }}>
                  Showing <span className="text-white font-semibold">{visible.length}</span> of{' '}
                  <span className="text-white font-semibold">{filtered.length}</span> entities
                </p>
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    className="text-[12px] font-bold px-6 py-3 rounded-xl cursor-pointer"
                    style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', color: '#9ca3af' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = ORANGE;
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.backgroundColor = `${ORANGE}08`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#1e1e1e';
                      e.currentTarget.style.color = '#9ca3af';
                      e.currentTarget.style.backgroundColor = '#111111';
                    }}
                  >
                    Load More Companies
                  </button>
                )}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-5 flex items-center justify-between" style={{ borderTop: '1px solid #141414' }}>
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>© 2024 CodePrep — Company Questions</span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#2a2a2a' }}>
            <FaTrophy size={10} style={{ color: ORANGE }} />
            Solve company questions to prepare for target interviews
          </div>
        </footer>
      </div>
    </div>
  );
}
