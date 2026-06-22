import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { useAppSelector } from '../../store/store';
import Sidebar from '../../components/dashboard/Sidebar';

/* ─────────────────────────────────────────────
   Letter avatar colour
───────────────────────────────────────────── */
const LETTER_COLORS = {
  ABC: '#F97316', DEF: '#8B5CF6', GHI: '#3B82F6',
  JKL: '#10B981', MNO: '#F59E0B', PQR: '#EF4444',
  STU: '#06B6D4', VWX: '#EC4899', YZ: '#6366F1',
};

function getLetterColor(name = '') {
  const ch = name.trim()[0]?.toUpperCase() || 'A';
  for (const [chars, color] of Object.entries(LETTER_COLORS)) {
    if (chars.includes(ch)) return color;
  }
  return '#F97316';
}

function displayName(str = '') {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─────────────────────────────────────────────
   Skeleton card
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'var(--bg-card,#0F0F1A)', border: '1px solid var(--border,rgba(255,255,255,0.06))' }}
    >
      <div className="w-10 h-10 rounded-xl mb-4"
        style={{ background: 'var(--bg-hover,#141428)' }} />
      <div className="h-3.5 rounded mb-2"
        style={{ background: 'var(--bg-hover,#141428)', width: '65%' }} />
      <div className="h-2.5 rounded"
        style={{ background: 'var(--bg-hover,#141428)', width: '40%' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Company card
───────────────────────────────────────────── */
function CompanyCard({ company, index, solvedCount }) {
  const navigate = useNavigate();
  const color    = getLetterColor(company);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: 'easeOut' }}
      whileHover={{
        y: -4,
        borderColor: 'rgba(249,115,22,0.3)',
        boxShadow: '0 8px 24px rgba(249,115,22,0.08)',
      }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate('/company/' + company)}
      className="rounded-xl p-5 cursor-pointer transition-colors"
      style={{
        background: 'var(--bg-card,#0F0F1A)',
        border:     '1px solid var(--border,rgba(255,255,255,0.06))',
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg mb-3 select-none"
        style={{ background: color }}
      >
        {company.trim()[0]?.toUpperCase() || '?'}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold leading-snug"
        style={{ color: 'var(--text-1,#F1F5F9)' }}
      >
        {displayName(company)}
      </p>

      {/* Progress / CTA */}
      <p className="text-xs mt-1" style={{ color: 'var(--text-3,#475569)' }}>
        {solvedCount > 0 ? `${solvedCount} solved · Continue →` : 'Practice questions →'}
      </p>

      {/* Thin bottom progress bar if user has solved any */}
      {solvedCount > 0 && (
        <div className="mt-3 h-0.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-hover,#141428)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((solvedCount / 50) * 100, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.1 + index * 0.02 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Sort types
───────────────────────────────────────────── */
const SORT_OPTS = ['A-Z', 'My Progress'];

const SIDEBAR_W = 220;

/* ─────────────────────────────────────────────
   DSAPractice Page
───────────────────────────────────────────── */
export default function DSAPractice() {
  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState('A-Z');

  const { user } = useAppSelector((s) => s.auth);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient.get('/api/companies').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  /* Count solved per company from Redux user */
  const solvedMap = useMemo(() => {
    const map = {};
    if (!user?.solvedQuestions) return map;
    for (const sq of user.solvedQuestions) {
      const co = (sq.company || '').toLowerCase();
      if (co) map[co] = (map[co] || 0) + 1;
    }
    return map;
  }, [user?.solvedQuestions]);

  /* Filter + sort */
  const filtered = useMemo(() => {
    let list = companies.filter((c) =>
      c.toLowerCase().includes(search.toLowerCase().trim())
    );

    if (sort === 'A-Z') {
      list = [...list].sort((a, b) => a.localeCompare(b));
    } else if (sort === 'My Progress') {
      list = [...list].sort((a, b) => {
        const sa = solvedMap[a.toLowerCase()] || 0;
        const sb = solvedMap[b.toLowerCase()] || 0;
        return sb - sa; // highest solved first
      });
    }

    return list;
  }, [companies, search, sort, solvedMap]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary,#07070F)' }}>
      <Sidebar />

      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: SIDEBAR_W }}
      >
        {/* ── Page Header ── */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1,#F1F5F9)' }}>
            Practice by Company
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3,#475569)' }}>
            {isLoading ? 'Loading…' : `${companies.length} companies available`}
          </p>
        </div>

        {/* ── Search + sort bar (sticky) ── */}
        <div
          className="sticky top-0 z-20 px-6 py-3 flex flex-wrap gap-3 items-center shrink-0"
          style={{
            background:   'rgba(7,7,15,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border,rgba(255,255,255,0.06))',
          }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-3,#475569)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies…"
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-colors"
              style={{
                background:    'var(--bg-card,#0F0F1A)',
                border:        '1px solid var(--border,rgba(255,255,255,0.06))',
                color:         'var(--text-1,#F1F5F9)',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--orange-dim,rgba(249,115,22,0.3))'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border,rgba(255,255,255,0.06))'; }}
            />
          </div>

          {/* Sort pills */}
          <div className="flex gap-2 shrink-0">
            {SORT_OPTS.map((opt) => {
              const active = sort === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSort(opt)}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'var(--orange-dim,rgba(249,115,22,0.12))' : 'var(--bg-card,#0F0F1A)',
                    color:      active ? 'var(--orange,#F97316)' : 'var(--text-3,#475569)',
                    border:     active ? '1px solid var(--orange-dim,rgba(249,115,22,0.25))' : '1px solid var(--border,rgba(255,255,255,0.06))',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Companies grid (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Building2 size={48} style={{ color: 'var(--text-3,#475569)' }} className="mb-3" />
              <p className="font-semibold" style={{ color: 'var(--text-1,#F1F5F9)' }}>No companies found</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3,#475569)' }}>
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {filtered.map((company, i) => (
                  <CompanyCard
                    key={company}
                    company={company}
                    index={i}
                    solvedCount={solvedMap[company.toLowerCase()] || 0}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
