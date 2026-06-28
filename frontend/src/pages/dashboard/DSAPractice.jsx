import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaBuilding, FaCheckCircle, FaArrowRight, FaSpinner, FaTrophy } from 'react-icons/fa';
import Sidebar from '../../components/dashboard/Sidebar';
import apiClient from '../../api/axios';
import { useAppSelector } from '../../store/store';

// ─── Constants ───────────────────────────────────────────────────────────────
const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';
const HOT_COMPANIES = new Set(['google', 'amazon', 'microsoft', 'meta', 'flipkart', 'apple', 'netflix']);
const PAGE_SIZE = 24;

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

const AVATAR_STYLES = [
  { bg: '#1a0f00', color: '#FF6B1A', border: 'rgba(255,107,26,0.18)' },
  { bg: '#0a0f1a', color: '#3b82f6', border: 'rgba(59,130,246,0.18)' },
  { bg: '#0a1a0f', color: '#22c55e', border: 'rgba(34,197,94,0.18)' },
  { bg: '#1a0a1a', color: '#a855f7', border: 'rgba(168,85,247,0.18)' },
];

function getAvatarStyle(name = '') {
  const code = name.charCodeAt(0) - 65;
  const idx = Math.max(0, code) % AVATAR_STYLES.length;
  return AVATAR_STYLES[idx];
}

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
  if (metaTags && Array.isArray(metaTags) && metaTags.length > 0) {
    return metaTags.slice(0, 3);
  }
  let key = 'default';
  if (name && typeof name === 'string') {
    key = name.toLowerCase().trim();
  } else if (name && typeof name === 'object' && name.name && typeof name.name === 'string') {
    key = name.name.toLowerCase().trim();
  }
  return FALLBACK_TAGS[key] || FALLBACK_TAGS.default;
}

const formatCompanyName = (name) => {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
function StatChip({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-black text-xl" style={{ color: accent || '#fff', letterSpacing: '-0.04em' }}>
          <AnimatedCounter value={value} />
        </span>
      </div>
    </div>
  );
}

// ─── Card Animation Variants ─────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.02, ease: 'easeOut' },
  }),
};

// ─── CompanyCard ─────────────────────────────────────────────────────────────
const CompanyCard = memo(function CompanyCard({ companyName, questionCount, topTags, index, solvedCount }) {
  const avatarStyle = getAvatarStyle(companyName.toUpperCase());
  const isHot = HOT_COMPANIES.has(companyName.toLowerCase());
  const pct = questionCount > 0 ? Math.round((solvedCount / questionCount) * 100) : 0;
  const accentColor = isHot ? ORANGE : avatarStyle.color;
  const displayName = formatCompanyName(companyName);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#111111',
        border: `1px solid ${isHot ? 'rgba(255,107,26,0.30)' : '#1e1e1e'}`,
        boxShadow: isHot ? '0 0 20px rgba(255,107,26,0.06)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s, background-color 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.borderColor = `${accentColor}50`;
        el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${accentColor}22`;
        el.style.transform = 'translateY(-3px)';
        el.style.backgroundColor = `${accentColor}06`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.borderColor = isHot ? 'rgba(255,107,26,0.30)' : '#1e1e1e';
        el.style.boxShadow = isHot ? '0 0 20px rgba(255,107,26,0.06)' : 'none';
        el.style.transform = 'translateY(0)';
        el.style.backgroundColor = '#111111';
      }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: accentColor }} />

      <Link
        to={`/company/${companyName.toLowerCase()}`}
        className="flex flex-col h-full p-5 pt-6 gap-4"
        style={{ textDecoration: 'none' }}
      >
        <div className="flex items-start justify-between">
          <div className="relative">
            <div
              className="w-12 h-12 flex items-center justify-center rounded-xl select-none text-[20px] font-black"
              style={{
                backgroundColor: avatarStyle.bg,
                color: avatarStyle.color,
                border: `1px solid ${avatarStyle.border}`,
              }}
            >
              {companyName[0].toUpperCase()}
            </div>
            {isHot && (
              <span
                className="absolute -top-1.5 -right-1.5 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: '#1a0800', color: ORANGE, border: '1px solid rgba(255,107,26,0.25)' }}
              >
                🔥 HOT
              </span>
            )}
          </div>

          <span
            className="text-[10px] font-semibold rounded-lg px-2.5 py-1"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #222', color: '#4b5563' }}
          >
            {questionCount} Qs
          </span>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-white font-black text-[15px] leading-tight capitalize truncate">
            {displayName}
          </h3>
          <div className="flex flex-wrap gap-1">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md"
                style={{ backgroundColor: '#1a1a1a', color: '#6b7280', border: '1px solid #222' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-semibold">
            <span style={{ color: '#4b5563' }}>{solvedCount} / {questionCount} solved</span>
            <span style={{ color: accentColor }} className="font-bold">{pct}%</span>
          </div>
          <GradientBar pct={pct} color={accentColor} delay={index * 0.02 + 0.1} />
        </div>

        <div
          className="w-full text-center text-[12px] font-bold rounded-xl py-2.5 transition-all duration-200"
          style={{
            backgroundColor: `${accentColor}12`,
            border: `1px solid ${accentColor}30`,
            color: accentColor,
          }}
        >
          Practice Questions →
        </div>
      </Link>
    </motion.div>
  );
});

// ─── CompanyCardSkeleton (High fidelity shimmer loader) ───────────────────────
function CompanyCardSkeleton() {
  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden p-5 pt-6 gap-4"
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
        height: '240px',
      }}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DSAPractice() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDir, setSortDir] = useState('asc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  const { user } = useAppSelector((state) => state.auth);

  // Fetch enriched companies meta from API
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

  const getCompanySolvedCount = useCallback((companyName) => {
    if (!user || !user.solvedQuestions) return 0;
    const targetContext = `company_${companyName.toLowerCase()}`;
    return user.solvedQuestions.filter(sq => sq.syncContext === targetContext).length;
  }, [user]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

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

  const summary = useMemo(() => {
    if (!companiesMeta) return { totalQuestions: 0, totalSolved: 0, pct: 0 };
    let totalQuestions = 0;
    let totalSolved = 0;

    for (const c of companiesMeta) {
      totalQuestions += Number(c.questionCount) || 0;
      totalSolved += getCompanySolvedCount(c.name);
    }

    const pct = totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0;
    return { totalQuestions, totalSolved, pct };
  }, [companiesMeta, getCompanySolvedCount]);

  return (
    <div className="min-h-screen text-white antialiased" style={{ backgroundColor: '#0A0A0A' }}>
      <Sidebar />

      <div className="flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_W }}>
        {/* ════════════════════════════════════════════════════════════
            HERO HEADER
            ════════════════════════════════════════════════════════════ */}
        <header className="px-10 pt-10 pb-10" style={{ borderBottom: '1px solid #141414' }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7">
            <FaBuilding size={12} style={{ color: ORANGE }} />
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
              Company Preparation
            </span>
          </div>

          {/* Title + glass stats panel */}
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
                Company
                <span style={{ color: ORANGE }}> Questions</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="text-[15px] font-normal max-w-lg"
                style={{ color: '#6b7280', lineHeight: 1.65 }}
              >
                Practice the most frequently asked interview questions from top companies. Filter by category, search names, and track your metrics.
              </motion.p>

              {/* Progress bar */}
              {!isLoading && !isError && companiesMeta && (
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
                      {summary.pct}% Complete
                    </span>
                  </div>
                  <div className="relative rounded-full overflow-hidden" style={{ height: 6, backgroundColor: '#1a1a1a' }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${ORANGE}80, ${ORANGE})`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${summary.pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Glass stats card */}
            {!isLoading && !isError && companiesMeta && (
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
                {/* Top accent line */}
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: ORANGE }} />

                <div className="px-7 py-6">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative flex-shrink-0">
                      <CircularProgress pct={summary.pct} size={92} stroke={7} color={ORANGE} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-black text-white" style={{ fontSize: '20px', letterSpacing: '-0.04em' }}>
                          <AnimatedCounter value={summary.pct} />%
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
                          done
                        </span>
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

                  {/* Summary metric cells */}
                  <div
                    className="grid grid-cols-3 gap-y-5 gap-x-2"
                    style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px' }}
                  >
                    <StatChip label="Total Companies" value={totalCount} />
                    <StatChip label="Questions" value={summary.totalQuestions} />
                    <StatChip label="Solved" value={summary.totalSolved} accent={ORANGE} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════
            SEARCH, FILTERS AND COMPANY GRID
            ════════════════════════════════════════════════════════════ */}
        <main className="flex-1 px-10 py-8 space-y-6">
          {/* ════════════════════════════════════════════════════════════
              SEARCH, FILTERS AND SORTING TOOLBAR
              ════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
            {/* Search Input Container */}
            <div
              className="flex items-center gap-3.5 rounded-2xl px-6 transition-all duration-200 flex-1 min-w-[280px]"
              style={{
                backgroundColor: '#141414',
                border: isFocused ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                boxShadow: isFocused ? '0 0 24px rgba(255,107,26,0.15), 0 8px 32px rgba(0,0,0,0.4)' : 'none',
                transform: isFocused ? 'translateY(-1px)' : 'none',
                height: '56px',
              }}
            >
              <FaSearch size={14} style={{ color: isFocused ? ORANGE : '#4b5563', flexShrink: 0, transition: 'color 0.2s' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={handleSearchChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search tech companies..."
                className="bg-transparent flex-1 outline-none text-[14px] text-white placeholder-[#4b5563]"
                style={{
                  border: 'none',
                  padding: 0,
                  outline: 'none',
                  boxShadow: 'none',
                  background: 'transparent',
                }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                  className="text-[#4b5563] hover:text-[#9ca3af] transition-colors text-lg leading-none bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

              {/* Sort pill toggles */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setSortDir('asc')}
                  className="text-[12px] font-bold px-4 py-2 rounded-xl transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor: sortDir === 'asc' ? ORANGE : '#111111',
                    border: sortDir === 'asc' ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                    color: sortDir === 'asc' ? '#fff' : '#4b5563',
                  }}
                >
                  Sort A-Z
                </button>
                <button
                  onClick={() => setSortDir('desc')}
                  className="text-[12px] font-bold px-4 py-2 rounded-xl transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor: sortDir === 'desc' ? ORANGE : '#111111',
                    border: sortDir === 'desc' ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                    color: sortDir === 'desc' ? '#fff' : '#4b5563',
                  }}
                >
                  Sort Z-A
                </button>
              </div>
            </div>

          {/* Skeletons loader */}
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-40">
                {Array.from({ length: 12 }).map((_, i) => (
                  <CompanyCardSkeleton key={i} />
                ))}
              </div>

              {/* Centered Glassmorphic Loading Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0F]/40 backdrop-blur-[2px] z-20 pointer-events-none rounded-3xl">
                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 bg-[#0D0D12]/95 shadow-2xl gap-4">
                  <img
                    src="/imagecopy.png"
                    alt="CodePrep AI Logo"
                    className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,107,26,0.22)] animate-pulse"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-ping" />
                    <span className="text-xs font-bold tracking-wide text-white">
                      Loading Company Questions...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error view */}
          {isError && (
            <div
              className="text-center py-16 rounded-2xl space-y-4"
              style={{ border: '1px dashed #1e1e1e', color: '#6b7280' }}
            >
              <div>
                <p className="text-[16px] font-bold text-white mb-1">Failed to load company questions</p>
                <p className="text-[13px]">There was an error communicating with the server. Please check your internet connection.</p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#FF7A00]/15 border border-[#FF7A00]/30 text-[#FFB800] hover:bg-[#FF7A00]/25 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty search state */}
          {!isLoading && !isError && filtered.length === 0 && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="text-5xl mb-4 select-none">🔍</div>
                <p className="text-white text-[17px] font-bold mb-1">No matches found</p>
                <p className="text-[13px]" style={{ color: '#4b5563' }}>
                  {debouncedSearch
                    ? 'No companies found with that query.'
                    : 'No matches found in the selected category.'}
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Grid layout */}
          {!isLoading && !isError && filtered.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visible.map((company, i) => {
                  const companyName = company?.name || '';
                  return (
                    <CompanyCard
                      key={companyName}
                      companyName={companyName}
                      questionCount={company?.questionCount || 0}
                      topTags={getTopTags(companyName, company?.topTags)}
                      index={i}
                      solvedCount={getCompanySolvedCount(companyName)}
                    />
                  );
                })}
              </div>

              {/* Load More section */}
              <div className="flex flex-col items-center gap-3 pt-6">
                <p className="text-[13px]" style={{ color: '#4b5563' }}>
                  Showing <span className="text-white font-semibold">{visible.length}</span> of{' '}
                  <span className="text-white font-semibold">{filtered.length}</span> entities
                </p>
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="text-[12px] font-bold px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: '#111111',
                      border: '1px solid #1e1e1e',
                      color: '#9ca3af',
                    }}
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
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — Company Questions
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#2a2a2a' }}>
            <FaTrophy size={10} style={{ color: ORANGE }} />
            Solve company questions to prepare for target interviews
          </div>
        </footer>
      </div>
    </div>
  );
}
