import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';


// ─── Constants ───────────────────────────────────────────────────────────────

const SIDEBAR_W = 220;
const HOT_COMPANIES = new Set(['google', 'amazon', 'microsoft', 'meta', 'flipkart', 'apple', 'netflix']);
const PAGE_SIZE = 20;

const FAANG = new Set(['google', 'meta', 'amazon', 'apple', 'netflix', 'microsoft']);
const MNC = new Set(['adobe', 'uber', 'salesforce', 'oracle', 'sap', 'ibm', 'accenture', 'deloitte', 'paypal', 'visa', 'mastercard', 'atlassian', 'shopify', 'twitter', 'linkedin', 'spotify', 'airbnb', 'lyft', 'stripe', 'square']);
const INDIA = new Set(['flipkart', 'paytm', 'swiggy', 'zomato', 'airtel', 'jio', 'infosys', 'wipro', 'tcs', 'hcl', 'snapdeal', 'ola', 'phonepe', 'meesho', 'zepto', 'myntra', 'cred', 'razorpay', 'groww', 'zerodha']);

const FILTER_PILLS = [
  { id: 'all',     emoji: '🌟', label: 'All' },
  { id: 'faang',   emoji: '🔥', label: 'FAANG' },
  { id: 'mnc',     emoji: '💼', label: 'MNC' },
  { id: 'startup', emoji: '🚀', label: 'Startup' },
  { id: 'india',   emoji: '🇮🇳', label: 'India' },
];

// ─── Avatar color palette (cycles by first letter) ───────────────────────────
const AVATAR_STYLES = [
  { bg: '#1a0f00', color: '#FF6B1A' }, // A, E, I, M, Q, U, Y
  { bg: '#0a0f1a', color: '#3b82f6' }, // B, F, J, N, R, V, Z
  { bg: '#0a1a0f', color: '#22c55e' }, // C, G, K, O, S, W
  { bg: '#1a0a1a', color: '#a855f7' }, // D, H, L, P, T, X
];

function getAvatarStyle(name = '') {
  const code = name.charCodeAt(0) - 65; // A=0, B=1 …
  const idx = Math.max(0, code) % AVATAR_STYLES.length;
  return AVATAR_STYLES[idx];
}

// ─── Company filter helper ────────────────────────────────────────────────────
function matchesFilter(companyName, filterId) {
  const key = companyName.toLowerCase().replace(/\s+/g, '');
  if (filterId === 'all') return true;
  if (filterId === 'faang') return FAANG.has(key) || [...FAANG].some(f => key.includes(f));
  if (filterId === 'mnc') return MNC.has(key) || [...MNC].some(m => key.includes(m));
  if (filterId === 'india') return INDIA.has(key) || [...INDIA].some(i => key.includes(i));
  if (filterId === 'startup') {
    const known = new Set([...FAANG, ...MNC, ...INDIA]);
    return !([...known].some(k => key.includes(k)));
  }
  return true;
}

// ─── Fallback tag data per company ───────────────────────────────────────────
const FALLBACK_TAGS = {
  google:    ['Array', 'DP', 'Graph'],
  amazon:    ['Array', 'Tree', 'Design'],
  microsoft: ['Tree', 'DP', 'Graph'],
  meta:      ['Array', 'Hash Table', 'Graph'],
  flipkart:  ['Array', 'DP', 'Greedy'],
  apple:     ['Array', 'String', 'Math'],
  netflix:   ['Array', 'Design', 'Hash Table'],
  adobe:     ['Array', 'Math', 'String'],
  uber:      ['Array', 'Graph', 'Tree'],
  linkedin:  ['Array', 'Graph', 'DP'],
  twitter:   ['Array', 'Design', 'Hash Table'],
  default:   ['Array', 'DP', 'Tree'],
};

function getTopTags(name, metaTags = []) {
  if (metaTags && metaTags.length > 0) return metaTags.slice(0, 3);
  const key = name.toLowerCase();
  return FALLBACK_TAGS[key] || FALLBACK_TAGS.default;
}

// ─── Card animation variants ─────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: 'easeOut' },
  }),
};

// ─── CompanyCard ─────────────────────────────────────────────────────────────
function CompanyCard({ company, index }) {
  const name = company.name || company;
  const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
  const avatarStyle = getAvatarStyle(name.toUpperCase());
  const isHot = HOT_COMPANIES.has(name.toLowerCase());
  const questionCount = company.questionCount || '—';
  const topTags = getTopTags(name, company.topTags);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group relative"
    >
      <Link
        to={`/company/${name.toLowerCase()}`}
        className="block h-full"
        style={{ textDecoration: 'none' }}
      >
        <div
          className="relative flex flex-col h-full rounded-[12px] p-5 transition-all duration-200"
          style={{
            backgroundColor: '#111111',
            border: isHot ? '1px solid rgba(255,107,26,0.30)' : '1px solid #1e1e1e',
            boxShadow: isHot ? '0 0 20px rgba(255,107,26,0.06)' : 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = isHot ? 'rgba(255,107,26,0.55)' : 'rgba(255,107,26,0.40)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,26,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = isHot ? 'rgba(255,107,26,0.30)' : '#1e1e1e';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isHot ? '0 0 20px rgba(255,107,26,0.06)' : 'none';
          }}
        >
          {/* Top Row */}
          <div className="flex items-start justify-between mb-3">
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-12 h-12 flex items-center justify-center rounded-[10px] select-none"
                style={{
                  backgroundColor: avatarStyle.bg,
                  color: avatarStyle.color,
                  fontSize: '22px',
                  fontWeight: 700,
                }}
              >
                {name[0].toUpperCase()}
              </div>
              {/* HOT badge */}
              {isHot && (
                <div
                  className="absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap"
                  style={{ backgroundColor: '#1a0800', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.2)' }}
                >
                  🔥 HOT
                </div>
              )}
            </div>

            {/* Question count badge */}
            <div
              className="text-[11px] font-semibold rounded-[6px] px-2 py-1"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#6b7280',
              }}
            >
              {questionCount} Qs
            </div>
          </div>

          {/* Company Name */}
          <p className="text-[15px] font-semibold text-white mb-2 capitalize leading-snug">
            {displayName}
          </p>

          {/* Top Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-1.5 py-0.5 rounded-[4px]"
                style={{ backgroundColor: '#1a1a1a', color: '#6b7280' }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA Button */}
          <div className="mt-auto">
            <div
              className="w-full text-center text-[12px] font-semibold rounded-[8px] py-2 transition-all duration-200 cta-btn"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #1e1e1e',
                color: '#6b7280',
              }}
            >
              Practice Questions →
            </div>
          </div>
        </div>
      </Link>

      <style>{`
        .group:hover .cta-btn {
          background-color: #FF6B1A !important;
          border-color: #FF6B1A !important;
          color: #ffffff !important;
        }
      `}</style>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const { data: companiesMeta, isLoading, isError } = useQuery({
    queryKey: ['companies-meta'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/companies/meta');
        return res.data;
      } catch {
        // Fallback to plain list
        const res = await apiClient.get('/api/companies');
        return (res.data || []).map(name => ({ name, questionCount: null, topTags: [] }));
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!companiesMeta) return [];
    const q = debouncedSearch.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    let list = companiesMeta;

    if (q) {
      list = list.filter(c => {
        const key = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return key.includes(q);
      });
    }

    if (activeFilter !== 'all') {
      list = list.filter(c => matchesFilter(c.name, activeFilter));
    }

    const sorted = [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [companiesMeta, debouncedSearch, activeFilter, sortDir]);

  const visible = filtered.slice(0, visibleCount);
  const totalCount = companiesMeta?.length || 0;
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0A0A0A' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>

        {/* ── SECTION 1: Header ─────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-30 px-6 py-5 flex items-center justify-between"
          style={{
            backgroundColor: '#0A0A0A',
            borderBottom: '1px solid #1e1e1e',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-[10px] font-mono font-black text-base select-none"
              style={{ backgroundColor: 'rgba(255,107,26,0.12)', color: '#FF6B1A' }}
            >
              {'</>'}
            </div>
            <div>
              <h1 className="text-white font-bold text-[22px] leading-tight">
                Company Questions
              </h1>
              <p className="text-[13px] leading-none mt-0.5" style={{ color: '#6b7280' }}>
                Practice real interview questions from top tech companies
              </p>
            </div>
          </div>

          {/* Badge */}
          <div
            className="hidden sm:flex items-center text-[12px] font-semibold px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: 'rgba(255,107,26,0.08)',
              border: '1px solid rgba(255,107,26,0.2)',
              color: '#FF6B1A',
            }}
          >
            {totalCount > 0 ? `${totalCount} companies` : '—'}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="px-6 py-6 space-y-5">

          {/* ── SECTION 2: Search + Filters ─────────────────────────────── */}
          <div className="space-y-3">
            {/* Search input */}
            <div
              className="flex items-center gap-3 rounded-[10px] px-4 transition-all duration-200"
              style={{
                backgroundColor: '#111111',
                border: isFocused ? '1px solid #FF6B1A' : '1px solid #1e1e1e',
                boxShadow: isFocused ? '0 0 0 2px rgba(255,107,26,0.1)' : 'none',
                height: '48px',
              }}
            >
              <FaSearch size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={search}
                onChange={handleSearchChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search companies..."
                className="bg-transparent flex-1 outline-none text-[14px] text-white placeholder-[#4b5563]"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                  className="text-[#4b5563] hover:text-[#9ca3af] transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter pills + sort */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
              {/* Pills */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {FILTER_PILLS.map(pill => {
                  const isActive = activeFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => { setActiveFilter(pill.id); setVisibleCount(PAGE_SIZE); }}
                      className="whitespace-nowrap text-[13px] font-semibold transition-all duration-150 cursor-pointer"
                      style={{
                        padding: '6px 16px',
                        borderRadius: '20px',
                        backgroundColor: isActive ? 'rgba(255,107,26,0.12)' : '#111111',
                        border: isActive ? '1px solid #FF6B1A' : '1px solid #1e1e1e',
                        color: isActive ? '#FF6B1A' : '#6b7280',
                      }}
                    >
                      {pill.emoji} {pill.label}
                    </button>
                  );
                })}
              </div>

              {/* Sort buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setSortDir('asc')}
                  className="text-[13px] font-semibold px-3.5 py-1.5 rounded-[8px] transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor: sortDir === 'asc' ? '#FF6B1A' : '#111111',
                    border: sortDir === 'asc' ? '1px solid #FF6B1A' : '1px solid #1e1e1e',
                    color: sortDir === 'asc' ? '#fff' : '#6b7280',
                  }}
                >
                  A-Z
                </button>
                <button
                  onClick={() => setSortDir('desc')}
                  className="text-[13px] font-semibold px-3.5 py-1.5 rounded-[8px] transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor: sortDir === 'desc' ? '#FF6B1A' : '#111111',
                    border: sortDir === 'desc' ? '1px solid #FF6B1A' : '1px solid #1e1e1e',
                    color: sortDir === 'desc' ? '#fff' : '#6b7280',
                  }}
                >
                  Z-A
                </button>
              </div>
            </div>
          </div>

          {/* ── SECTION 3–4: Grid ───────────────────────────────────────── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[12px] p-5 animate-pulse"
                  style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', height: '180px' }}
                />
              ))}
            </div>
          ) : isError ? (
            <div
              className="text-center py-16 rounded-[12px]"
              style={{ border: '1px dashed #1e1e1e', color: '#6b7280' }}
            >
              <p className="text-[16px] font-semibold text-white mb-1">Failed to load companies</p>
              <p className="text-[13px]">Please refresh the page or try again later.</p>
            </div>
          ) : filtered.length === 0 ? (
            /* ── SECTION 5: Empty state ─────────────────────────────── */
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="text-5xl mb-4 select-none">🔍</div>
                <p className="text-white text-[18px] font-bold mb-1">No companies found</p>
                <p className="text-[14px]" style={{ color: '#6b7280' }}>
                  {debouncedSearch
                    ? `Try searching with a different name`
                    : 'No companies match the selected filter'}
                </p>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {visible.map((company, i) => (
                    <CompanyCard key={company.name || company} company={company} index={i} />
                  ))}
                </AnimatePresence>
              </div>

              {/* ── SECTION 6: Load More ────────────────────────────── */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <p className="text-[13px]" style={{ color: '#6b7280' }}>
                  Showing <span className="text-white font-semibold">{visible.length}</span> of{' '}
                  <span className="text-white font-semibold">{filtered.length}</span> companies
                </p>
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="text-[13px] font-semibold px-6 py-2.5 rounded-[10px] transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: '#111111',
                      border: '1px solid #1e1e1e',
                      color: '#9ca3af',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#FF6B1A';
                      e.currentTarget.style.color = '#FF6B1A';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#1e1e1e';
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                  >
                    Load More Companies
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
