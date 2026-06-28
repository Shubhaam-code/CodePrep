import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTrophy as TrophyIcon,
  FaCheck as CheckIcon,
  FaLock as LockIcon,
  FaChevronDown as ChevronDownIcon,
  FaExternalLinkAlt as ExternalLinkIcon,
  FaFire as FireIcon,
  FaCalendarCheck as CalendarIcon,
} from 'react-icons/fa';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { setUser } from '../../store/authSlice';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';

// ─── Image generation using Pollinations.AI ───────────────────────────────────
export const buildImageUrl = (tags = [], dayNumber = 1) => {
  const map = {
    "Array": "cinematic dark macro shot of glowing amber circuit traces forming a perfect grid, orange neon light, black background, 8k, ultra detailed, no text",
    "Hash Table": "cinematic dark visualization of glowing orange neural network nodes connected by light threads, black void background, dramatic lighting, ultra detailed, no text",
    "Linked List": "cinematic dark glowing amber chain of metallic orbs floating in void connected by light beams, black background, dramatic lighting, no text",
    "Tree": "cinematic dark glowing orange fractal tree branching into infinity, black void background, bioluminescent, ultra detailed, no text",
    "Graph": "cinematic dark constellation of glowing orange nodes pulsing energy between connections, black space background, ultra detailed, no text",
    "Stack": "cinematic dark glowing amber holographic data layers stacking upward into darkness, black background, dramatic lighting, no text",
    "Binary Search": "cinematic dark glowing orange sorted data bars with spotlight highlighting center, black background, ultra detailed, no text",
    "Dynamic Programming": "cinematic dark glowing amber grid of interconnected data cells lighting up in sequence, black background, ultra detailed, no text",
    "String": "cinematic dark flowing streams of glowing orange characters dissolving into particles, black void, ultra detailed, no text",
    "Math": "cinematic dark golden ratio spiral rendered in glowing orange light, black background, ultra detailed, no text",
    "Sorting": "cinematic dark glowing orange bars arranging into perfect order with light trails, black background, ultra detailed, no text",
    "Two Pointers": "cinematic dark two beams of orange light scanning through data from opposite ends, black background, ultra detailed, no text",
    "Sliding Window": "cinematic dark glowing orange window frame sliding through streams of data particles, black void, ultra detailed, no text",
    "Backtracking": "cinematic dark maze of glowing orange recursive pathways branching and merging, black background, ultra detailed, no text",
    "default": "cinematic dark glowing orange circuit motherboard macro photography, black background, dramatic rim lighting, ultra detailed, no text"
  };
  const matchedTag = tags.find(tag => map[tag]);
  const prompt = map[matchedTag] || map['default'];
  const seed = dayNumber * 42;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=400&nologo=true&seed=${seed}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDifficultyBadgeStyles(difficulty = '') {
  const d = difficulty.toUpperCase();
  if (d === 'EASY') return { bg: '#0d2218', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' };
  if (d === 'MEDIUM') return { bg: '#261b06', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' };
  if (d === 'HARD') return { bg: '#210a0a', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' };
  return { bg: '#1a1a1a', color: '#94a3b8', border: '1px solid #333' };
}

// ─── Sidebar width constant (must match Sidebar component) ────────────────────
const SIDEBAR_W = 220;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GVChallenge() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const queryClient = useQueryClient();

  const [toast, setToast] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Fetch challenge questions list
  const { data: questionsData, isLoading: loadingQ } = useQuery({
    queryKey: ['gv-questions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/gvchallenge/questions');
      return res.data.questions || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch challenge progress
  const { data: progress, isLoading: loadingP } = useQuery({
    queryKey: ['gv-progress'],
    queryFn: async () => {
      const res = await apiClient.get('/api/gvchallenge/progress');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const questions = questionsData || [];
  const prog = progress || { totalCompleted: 0, currentStreak: 0, completedDays: [] };
  const currentDay = prog.totalCompleted + 1;
  const currentQuestion = questions[currentDay - 1] || null;

  // Extract slug for today's challenge
  const leetcodeSlug = currentQuestion?.leetcodeUrl
    ? currentQuestion.leetcodeUrl.split('/problems/')[1]?.replace('/', '')
    : null;

  // Fetch rich LeetCode problem data
  const { data: leetcodeData, isLoading: loadingLC } = useQuery({
    queryKey: ['leetcode-problem', leetcodeSlug],
    queryFn: async () => {
      if (!leetcodeSlug) return null;
      const res = await apiClient.get(`/api/leetcode/${leetcodeSlug}`);
      return res.data;
    },
    enabled: !!leetcodeSlug,
  });

  const completedDayNums = new Set(
    (prog.completedDays || []).map((c) => c.dayNumber)
  );

  // Already solved handler
  const [alreadySolvedBusy, setAlreadySolvedBusy] = useState(false);
  const handleAlreadySolved = async () => {
    if (!currentQuestion || alreadySolvedBusy) return;
    setAlreadySolvedBusy(true);
    try {
      await apiClient.post('/api/gvchallenge/mark-already-solved', {
        dayNumber: currentDay,
        questionTitle: currentQuestion.title,
      });
      try {
        const profileRes = await apiClient.get('/api/auth/me');
        if (profileRes?.data) dispatch(setUser(profileRes.data));
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['gv-progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setToast('✓ Day marked complete. Next day unlocked.');
    } catch (err) {
      setToast('❌ Could not mark as solved. Try again.');
    } finally {
      setAlreadySolvedBusy(false);
    }
  };

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Filter & Paginate Table
  const filteredQuestions = questions.filter((q) => {
    if (filterDifficulty === 'All') return true;
    return q.difficulty?.toUpperCase() === filterDifficulty.toUpperCase();
  });
  const visibleQuestions = filteredQuestions.slice(0, visibleCount);

  // ── Auto-collapse sidebar when entering this page ──────────────────────────
  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', 'true'); } catch {}
    // Signal the sidebar to collapse by dispatching a custom event
    window.dispatchEvent(new CustomEvent('gv-challenge-entered'));
  }, []);

  // ── Resolve LeetCode URL robustly ────────────────────────────────────────
  // The CSV parser returns '' (empty string) for missing URLs, not null.
  // We must treat empty string as missing, and construct a slug-based fallback.
  const resolveLeetcodeUrl = (question, apiData) => {
    // Priority 1: from our proxy API (most reliable)
    if (apiData?.leetcodeUrl && apiData.leetcodeUrl.startsWith('http')) return apiData.leetcodeUrl;
    // Priority 2: from the GV questions CSV field
    if (question?.leetcodeUrl && question.leetcodeUrl.startsWith('http')) return question.leetcodeUrl;
    // Priority 3: construct from title slug
    if (question?.title) {
      const slug = question.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      return `https://leetcode.com/problems/${slug}/`;
    }
    return null;
  };
  const leetcodeUrl = resolveLeetcodeUrl(currentQuestion, leetcodeData);

  // Helper: open a URL safely in a new tab
  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="min-h-screen text-white antialiased select-none"
      style={{ backgroundColor: '#0A0A0A', fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}
    >
      {/* ── Shared Sidebar ── */}
      <Sidebar />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -16, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-5 left-1/2 z-[9999] px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl"
            style={{
              background: '#161616',
              border: '1px solid #2a2a2a',
              backdropFilter: 'blur(12px)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout offset by sidebar ── */}
      <div className="flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_W }}>

        {/* ══════════════════════════════════════════════════════════
            HERO HEADER — Premium page title
            ══════════════════════════════════════════════════════════ */}
        <header
          className="px-10 pt-10 pb-8"
          style={{ borderBottom: '1px solid #161616' }}
        >
          {/* Top row: breadcrumb + user badge */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrophyIcon size={13} style={{ color: '#FF6B1A' }} />
              <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
                G. Vishwanathan Challenge
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className="text-[10px] font-bold tracking-wider px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(34,197,94,0.08)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                ● GITHUB CONNECTED
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF9A1A)' }}
              >
                {(user?.displayName || user?.githubUsername || 'U')
                  .split(/[-_\s]/)
                  .map(w => w[0]?.toUpperCase())
                  .slice(0, 2)
                  .join('')}
              </div>
            </div>
          </div>

          {/* Hero title */}
          <div className="space-y-3">
            <h1
              className="font-black leading-none tracking-tight"
              style={{ fontSize: 'clamp(36px, 4vw, 54px)', color: '#ffffff', letterSpacing: '-0.03em' }}
            >
              G. Vishwanathan
              <span style={{ color: '#FF6B1A' }}> Challenge</span>
            </h1>
            <p className="text-base font-normal max-w-xl" style={{ color: '#6b7280', lineHeight: 1.6 }}>
              30-day structured DSA practice program. One problem per day, real interview questions, progressive difficulty.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-8">
            {/* Days completed */}
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#0d2218', color: '#22c55e' }}
              >
                <CheckIcon size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
                  Days Completed
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-black text-white" style={{ letterSpacing: '-0.04em' }}>
                    {prog.totalCompleted}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#4b5563' }}>/30</span>
                </div>
              </div>
            </div>

            {/* Current streak */}
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: '#1c1005' }}
              >
                🔥
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
                  Current Streak
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-black text-white" style={{ letterSpacing: '-0.04em' }}>
                    {prog.currentStreak}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#4b5563' }}>days</span>
                </div>
              </div>
            </div>

            {/* Progress pill */}
            <div className="flex-1 hidden lg:block">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#4b5563' }}>
                  Overall Progress
                </span>
                <span className="text-[11px] font-bold" style={{ color: '#FF6B1A' }}>
                  {Math.round((prog.totalCompleted / 30) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: '#FF6B1A' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (prog.totalCompleted / 30) * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* ── Page body ── */}
        <main className="flex-1 px-10 py-8 space-y-8">

          {/* ══════════════════════════════════════════════════════════
              TODAY'S CHALLENGE — Premium stacked hero layout
              ══════════════════════════════════════════════════════════ */}
          <section
            className="rounded-2xl relative"
            style={{
              backgroundColor: '#111111',
              border: '1px solid #1e1e1e',
              boxShadow: '0 0 0 1px rgba(255,107,26,0.05), 0 24px 48px rgba(0,0,0,0.35)',
              overflow: 'visible',
            }}
          >
            {/* Top orange accent line */}
            <div
              className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl z-30"
              style={{ backgroundColor: '#FF6B1A' }}
            />

            {loadingQ || loadingP ? (
              <div className="p-10 space-y-5">
                <div className="h-5 w-1/4 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-56 rounded-xl bg-white/5 animate-pulse" />
              </div>
            ) : !currentQuestion ? (
              <div className="p-16 text-center space-y-4">
                <div className="text-5xl">🎉</div>
                <p className="text-2xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                  All 30 Challenges Completed!
                </p>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  You have conquered the G. Vishwanathan Challenge. Respect.
                </p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row" style={{ minHeight: '300px' }}>

                {/* ── LEFT: Challenge artwork — 35% width, contained image ── */}
                <div
                  className="relative flex-shrink-0 rounded-tl-2xl rounded-bl-2xl overflow-hidden"
                  style={{
                    width: '35%',
                    minWidth: '220px',
                    maxWidth: '300px',
                    backgroundColor: '#0d0d0d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Day badges */}
                  <div className="absolute top-6 left-6 z-20 flex gap-2">
                    <span
                      className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md shadow-lg"
                      style={{ backgroundColor: '#FF6B1A', color: '#fff' }}
                    >
                      TODAY
                    </span>
                    <span
                      className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      DAY {currentDay}
                    </span>
                  </div>

                  {/* Right-edge fade to card background */}
                  <div
                    className="absolute inset-y-0 right-0 z-10 pointer-events-none"
                    style={{
                      width: '48px',
                      background: 'linear-gradient(to right, transparent, #111111)',
                    }}
                  />

                  {/* Contained image with padding — full logo always visible */}
                  <img
                    src="/downloads/challange.png"
                    alt="G. Vishwanathan Challenge artwork"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      padding: '24px 16px',
                    }}
                  />
                </div>

                {/* ── RIGHT: Problem details — clean, spacious, title-dominant ── */}
                <div
                  className="flex-1 flex flex-col justify-between"
                  style={{ padding: '36px 40px 36px 36px' }}
                >
                  {/* Top section: meta + title + tags */}
                  <div className="space-y-5">
                    {/* Difficulty + day label row */}
                    <div className="flex items-center gap-3">
                      {(() => {
                        const diff = currentQuestion.difficulty || 'Easy';
                        const styles = getDifficultyBadgeStyles(diff);
                        return (
                          <span
                            className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase"
                            style={{ backgroundColor: styles.bg, color: styles.color, border: styles.border }}
                          >
                            {diff}
                          </span>
                        );
                      })()}
                      <span
                        className="text-[10px] font-semibold tracking-widest uppercase"
                        style={{ color: '#3d3d3d' }}
                      >
                        Day {currentDay} of 30
                      </span>
                    </div>

                    {/* TITLE — the visual focus */}
                    <h2
                      className="font-black leading-tight"
                      style={{
                        fontSize: 'clamp(26px, 2.8vw, 40px)',
                        color: '#ffffff',
                        letterSpacing: '-0.035em',
                        lineHeight: 1.15,
                      }}
                    >
                      {currentQuestion.title}
                    </h2>

                    {/* Topic tags */}
                    {(() => {
                      const tags = (leetcodeData?.tags || (currentQuestion.topic ? [currentQuestion.topic] : [])).slice(0, 5);
                      return tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                              style={{
                                backgroundColor: '#181818',
                                color: '#6b7280',
                                border: '1px solid #222',
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Bottom section: action buttons */}
                  <div className="flex items-center gap-3 mt-8">
                    {/* Primary: Open on LeetCode — explicit window.open to bypass any routing */}
                    <button
                      onClick={() => openInNewTab(leetcodeUrl)}
                      className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white"
                      style={{
                        backgroundColor: '#FF6B1A',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#ff7b30';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,107,26,0.35)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#FF6B1A';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <ExternalLinkIcon size={12} />
                      Open on LeetCode
                    </button>

                    {/* Secondary: Already Solved */}
                    <button
                      onClick={handleAlreadySolved}
                      disabled={alreadySolvedBusy}
                      className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm"
                      style={{
                        backgroundColor: '#161616',
                        border: '1px solid #272727',
                        color: '#9ca3af',
                        cursor: alreadySolvedBusy ? 'not-allowed' : 'pointer',
                        opacity: alreadySolvedBusy ? 0.45 : 1,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!alreadySolvedBusy) {
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.backgroundColor = '#1e1e1e';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#2a2a2a';
                        e.currentTarget.style.color = '#9ca3af';
                        e.currentTarget.style.backgroundColor = '#161616';
                      }}
                    >
                      <CheckIcon size={13} className="text-green-500" />
                      {alreadySolvedBusy ? 'Marking…' : 'Already Solved'}
                    </button>
                  </div>

                </div>
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════
              ALL CHALLENGE QUESTIONS TABLE
              ══════════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            {/* Table title row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h3
                  className="font-black text-white"
                  style={{ fontSize: '18px', letterSpacing: '-0.02em' }}
                >
                  All Challenge Questions
                </h3>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase"
                  style={{ backgroundColor: '#1a1a1a', color: '#6b7280' }}
                >
                  {questions.length} TOTAL
                </span>
              </div>

              {/* Filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2.5 text-[12px] font-bold px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: '#161616',
                    border: '1px solid #2a2a2a',
                    color: '#9ca3af',
                  }}
                >
                  {filterDifficulty === 'All' ? 'All Difficulties' : filterDifficulty}
                  <ChevronDownIcon
                    size={10}
                    className={`transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {showFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden z-30 shadow-2xl"
                      style={{
                        backgroundColor: '#161616',
                        border: '1px solid #2a2a2a',
                      }}
                    >
                      {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                        <button
                          key={diff}
                          onClick={() => {
                            setFilterDifficulty(diff);
                            setShowFilterDropdown(false);
                            setVisibleCount(10);
                          }}
                          className="w-full text-left px-4 py-2.5 text-[12px] font-semibold transition-colors"
                          style={{
                            color: filterDifficulty === diff || (diff === 'All' && filterDifficulty === 'All')
                              ? '#FF6B1A'
                              : '#6b7280',
                            backgroundColor: filterDifficulty === diff
                              ? 'rgba(255,107,26,0.06)'
                              : 'transparent',
                          }}
                          onMouseEnter={e => {
                            if (filterDifficulty !== diff)
                              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = filterDifficulty === diff
                              ? 'rgba(255,107,26,0.06)'
                              : 'transparent';
                          }}
                        >
                          {diff === 'All' ? 'All Difficulties' : diff}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
            >
              {/* Header row */}
              <div
                className="grid items-center px-6 py-3.5"
                style={{
                  gridTemplateColumns: '64px 1fr 120px 140px 100px',
                  borderBottom: '1px solid #1a1a1a',
                  backgroundColor: '#0D0D0D',
                }}
              >
                {['DAY', 'QUESTION', 'DIFFICULTY', 'STATUS', 'ACTION'].map((h) => (
                  <span
                    key={h}
                    className="text-[10px] font-black tracking-widest"
                    style={{ color: '#4b5563' }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {loadingQ ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-white/4 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#141414' }}>
                  {visibleQuestions.map((q) => {
                    const isToday = q.dayNumber === currentDay;
                    const isDone = completedDayNums.has(q.dayNumber);
                    const isLocked = q.dayNumber > currentDay;
                    const diffStyles = getDifficultyBadgeStyles(q.difficulty);

                    return (
                      <motion.div
                        key={q.dayNumber}
                        className="grid items-center px-6 py-4 transition-colors duration-150"
                        style={{
                          gridTemplateColumns: '64px 1fr 120px 140px 100px',
                          backgroundColor: isToday ? '#141414' : 'transparent',
                          borderLeft: isToday ? '2px solid #FF6B1A' : '2px solid transparent',
                          paddingLeft: isToday ? '22px' : '24px',
                        }}
                        whileHover={{ backgroundColor: '#141414' }}
                        transition={{ duration: 0.12 }}
                      >
                        {/* Day */}
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color: isToday ? '#FF6B1A' : '#3d3d3d' }}
                        >
                          {String(q.dayNumber).padStart(2, '0')}
                        </span>

                        {/* Title */}
                        <span
                          className="text-sm font-semibold truncate pr-4"
                          style={{ color: isLocked ? '#3d3d3d' : isDone ? '#6b7280' : '#e5e7eb' }}
                        >
                          {q.title}
                        </span>

                        {/* Difficulty */}
                        <div>
                          {q.difficulty ? (
                            <span
                              className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
                              style={{ backgroundColor: diffStyles.bg, color: diffStyles.color, border: diffStyles.border }}
                            >
                              {q.difficulty}
                            </span>
                          ) : (
                            <span style={{ color: '#3d3d3d' }}>—</span>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          {isDone ? (
                            <span
                              className="text-[10px] font-black flex items-center gap-1.5"
                              style={{ color: '#22c55e' }}
                            >
                              <CheckIcon size={10} /> SOLVED
                            </span>
                          ) : isToday ? (
                            <span
                              className="text-[10px] font-black flex items-center gap-1.5"
                              style={{ color: '#FF6B1A' }}
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-ping" />
                              IN PROGRESS
                            </span>
                          ) : isLocked ? (
                            <span
                              className="text-[10px] font-black flex items-center gap-1.5"
                              style={{ color: '#2a2a2a' }}
                            >
                              <LockIcon size={10} /> LOCKED
                            </span>
                          ) : (
                            <span style={{ color: '#2a2a2a' }}>—</span>
                          )}
                        </div>

                        {/* Action */}
                        <div>
                          {isDone ? (
                            <button
                              onClick={() => {
                                const url = (q.leetcodeUrl && q.leetcodeUrl.startsWith('http'))
                                  ? q.leetcodeUrl
                                  : `https://leetcode.com/problems/${q.title?.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-')}/`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-[11px] font-semibold transition-colors cursor-pointer"
                              style={{ background: 'none', border: 'none', padding: 0, color: '#4b5563' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; }}
                            >
                              Review ↗
                            </button>
                          ) : isToday ? (
                            <button
                              onClick={() => {
                                const url = (q.leetcodeUrl && q.leetcodeUrl.startsWith('http'))
                                  ? q.leetcodeUrl
                                  : `https://leetcode.com/problems/${q.title?.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-')}/`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-[11px] font-bold transition-colors cursor-pointer"
                              style={{ background: 'none', border: 'none', padding: 0, color: '#FF6B1A' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#ff8c45'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#FF6B1A'; }}
                            >
                              Solve ↗
                            </button>
                          ) : (
                            <span style={{ color: '#2a2a2a' }}>—</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {filteredQuestions.length === 0 && (
                    <div className="py-16 text-center text-sm" style={{ color: '#4b5563' }}>
                      No questions match the selected filter.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Load More */}
            {filteredQuestions.length > visibleCount && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className="text-[12px] font-bold px-6 py-2.5 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1e1e1e',
                    color: '#6b7280',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#FF6B1A';
                    e.currentTarget.style.color = '#FF6B1A';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#1e1e1e';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  Load More Days
                </button>
              </div>
            )}
          </section>

        </main>

        {/* ── Footer ── */}
        <footer
          className="mt-auto px-10 py-6 flex items-center justify-between"
          style={{ borderTop: '1px solid #141414' }}
        >
          <span className="text-[12px]" style={{ color: '#3d3d3d' }}>
            © 2024 CodePrep — Dedicated to G. Vishwanathan
          </span>
          <div className="flex items-center gap-5 text-[12px]" style={{ color: '#3d3d3d' }}>
            {['Documentation', 'Privacy', 'Support'].map((link) => (
              <a
                key={link}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="transition-colors"
                onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3d3d3d'; }}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
