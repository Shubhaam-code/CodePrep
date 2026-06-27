import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCheckCircle as CheckCircle, FaExternalLinkAlt as ExternalLink, FaFire as Flame
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { setUser } from '../../store/authSlice';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';

const SIDEBAR_W = 224;

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function diffColor(d = '') {
  const dl = d.toLowerCase();
  if (dl === 'easy') return { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' };
  if (dl === 'hard') return { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)' };
  return { bg: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: 'rgba(234,179,8,0.25)' };
}

function getLeetCodeUrl(q) {
  if (!q) return '';
  let url = q.leetcodeUrl || '';
  if (!url) return '';
  
  let finalUrl = '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    finalUrl = url;
  } else {
    // Otherwise, it might be a text like "Two Sum - LeetCode"
    let slug = url.replace(/\s*-\s*leetcode\s*/i, '').trim();
    slug = slug
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
      
    if (!slug) return '';
    finalUrl = `https://leetcode.com/problems/${slug}/`;
  }

  if (q.dayNumber !== undefined && q.dayNumber !== null) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}challenge=gv&day=${q.dayNumber}`;
  }
  return finalUrl;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl text-sm font-semibold shadow-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {message}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GVChallenge() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const queryClient = useQueryClient();

  const [toast, setToast] = useState('');

  // Fetch questions
  const { data: questionsData, isLoading: loadingQ } = useQuery({
    queryKey: ['gv-questions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/gvchallenge/questions');
      return res.data.questions || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch progress
  const { data: progress, isLoading: loadingP, refetch: refetchProgress } = useQuery({
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

  // Temporary logs to inspect the challenge object
  useEffect(() => {
    if (currentQuestion) {
      console.log("Challenge:", currentQuestion);
    }
  }, [currentQuestion]);

  // ── GV Challenge is fully isolated from user.solvedQuestions ──
  // The solved-day set is sourced from /api/gvchallenge/progress
  // (which reads from the GVChallenge collection for THIS user).
  // Solving a Company/Pattern/Sheet/Roadmap question must NEVER
  // change anything here, and a GV solve must NEVER affect the
  // global solved count surfaced on the dashboard — those surfaces
  // continue to read from user.solvedQuestions independently.
  const completedDayNums = new Set(
    (prog.completedDays || []).map((c) => c.dayNumber)
  );
  const currentDaySolved = currentQuestion
    ? completedDayNums.has(currentQuestion.dayNumber)
    : false;

  // ── Already Solved Before ─────────────────────────────────────────────────
  // For users who solved the current GV question BEFORE joining CodePrep.
  const [alreadySolvedBusy, setAlreadySolvedBusy] = useState(false);
  const handleAlreadySolved = async () => {
    if (!currentQuestion) return;
    if (alreadySolvedBusy) return;
    setAlreadySolvedBusy(true);
    try {
      await apiClient.post('/api/gvchallenge/mark-already-solved', {
        dayNumber: currentDay,
        questionTitle: currentQuestion.title,
      });
      try {
        const profileRes = await apiClient.get('/api/auth/me');
        if (profileRes?.data) dispatch(setUser(profileRes.data));
      } catch (profileErr) {
        console.warn('[GVChallenge] Could not refresh user after mark-already-solved:', profileErr);
      }
      queryClient.invalidateQueries({ queryKey: ['gv-progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setToast('✓ Day marked complete. Next day unlocked.');
    } catch (err) {
      console.error('[GVChallenge] mark-already-solved failed:', err);
      setToast('❌ Could not mark as already solved. Try again.');
    } finally {
      setAlreadySolvedBusy(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREEN: home
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-12" style={{ marginLeft: SIDEBAR_W }}>
        <AnimatePresence>
          {toast && <Toast message={toast} onDone={() => setToast('')} />}
        </AnimatePresence>

        {/* HEADER */}
        <div
          className="text-center px-6 pt-8 pb-6"
          style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.08) 0%, transparent 100%)' }}
        >
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-3"
            style={{
              background: 'var(--orange-dim)',
              color: 'var(--orange)',
              border: '1px solid rgba(249,115,22,0.3)',
            }}
          >
            🏆 G. Viswanathan Challenge
          </span>
          <h1 className="text-3xl font-bold mt-1" style={{ color: 'var(--text-1)' }}>
            Solve & Track. Daily.
          </h1>
          <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--text-2)' }}>
            Solve one DSA question daily and track your progress.
          </p>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4 mx-6 mb-6">
          {[
            { label: 'Days Completed', value: prog.totalCompleted, icon: <CheckCircle size={18} className="text-green-400" /> },
            { label: 'Current Streak 🔥', value: prog.currentStreak, icon: <Flame size={18} style={{ color: 'var(--orange)' }} /> },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex justify-center mb-2">{icon}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* TODAY'S QUESTION CARD */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-6 mb-6 rounded-2xl p-7"
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--orange-dim)',
          }}
        >
          {loadingQ || loadingP ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : !currentQuestion ? (
            <p className="text-center text-2xl" style={{ color: 'var(--text-2)' }}>
              🎉 All questions completed!
            </p>
          ) : (
            <>
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={
                    currentDaySolved
                      ? { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                      : { background: 'var(--orange-dim)', color: 'var(--orange)' }
                  }
                >
                  {currentDaySolved ? '✓ Solved' : '📅 Today'}
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--orange)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Day {currentDay}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                {currentQuestion.title}
              </h2>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {currentQuestion.difficulty && (() => {
                  const dc = diffColor(currentQuestion.difficulty);
                  return (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold border"
                      style={{ background: dc.bg, color: dc.color, borderColor: dc.border }}>
                      {currentQuestion.difficulty}
                    </span>
                  );
                })()}
                {currentQuestion.topic && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    {currentQuestion.topic}
                  </span>
                )}
              </div>

              <div className="border-b mb-4" style={{ borderColor: 'var(--border)' }} />

              {currentDaySolved ? (
                /* ── Already solved: show ✓ Solved card; no manual action needed. */
                <div
                  className="rounded-xl p-5 flex items-center gap-3"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <CheckCircle size={22} className="text-green-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                      ✓ Solved
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Day {currentDay} is done. Next: Day {currentDay + 1} unlocked.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Instructions */}
                  <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--text-2)' }}>
                    <p>1. Open the question on LeetCode below</p>
                    <p>2. Solve &amp; Submit — CodePrep auto-syncs to GitHub ✅</p>
                  </div>

                  {/* Open LeetCode button */}
                  <button
                    onClick={() => {
                      const url = getLeetCodeUrl(currentQuestion);
                      if (url) window.open(url, '_blank');
                    }}
                    disabled={!getLeetCodeUrl(currentQuestion)}
                    className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-4 ${
                      getLeetCodeUrl(currentQuestion)
                        ? 'cursor-pointer text-black hover:opacity-90'
                        : 'cursor-not-allowed opacity-50 text-gray-400'
                    }`}
                    style={{
                      background: getLeetCodeUrl(currentQuestion)
                        ? 'linear-gradient(135deg, var(--orange), var(--secondary))'
                        : 'var(--bg-hover)',
                      border: getLeetCodeUrl(currentQuestion) ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {getLeetCodeUrl(currentQuestion) ? (
                      <>
                        <ExternalLink size={15} /> Open on LeetCode →
                      </>
                    ) : (
                      'Question link unavailable'
                    )}
      
                  </button>

                  {/* Already Solved Before (current day only) */}
                  <button
                    onClick={handleAlreadySolved}
                    disabled={alreadySolvedBusy}
                    className="cursor-pointer w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                    title="Mark this day complete if you solved the question before joining CodePrep. No GitHub push."
                  >
                    {alreadySolvedBusy ? '⏳ Marking…' : '✓ Already Solved Before'}
                  </button>

                </>
              )}
            </>
          )}
        </motion.div>

        {/* QUESTIONS TABLE */}
        <div className="px-6 pb-8">
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>
            All Challenge Questions
          </h2>

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Table header */}
            <div
              className="grid px-4 py-3 text-xs uppercase tracking-wide"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-3)',
                gridTemplateColumns: '80px 1fr 90px 80px 80px',
              }}
            >
              <span>Day</span>
              <span>Question</span>
              <span>Difficulty</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {loadingQ ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {questions.map((q) => {
                  const isToday = q.dayNumber === currentDay;
                  // Solved state comes exclusively from the GVChallenge
                  // collection (via /api/gvchallenge/progress). It is
                  // intentionally NOT cross-checked against Redux's
                  // user.solvedQuestions — Company/Pattern/Sheet/Roadmap
                  // solves must never affect GV Challenge rows.
                  const isDone = completedDayNums.has(q.dayNumber);
                  const dc = diffColor(q.difficulty);

                  return (
                    <div
                      key={q.dayNumber}
                      className="grid items-center px-4 py-3 transition-all"
                      style={{
                        gridTemplateColumns: '80px 1fr 90px 80px 80px',
                        background: isToday ? 'var(--orange-dim)' : 'transparent',
                        borderLeft: isToday ? '3px solid var(--orange)' : '3px solid transparent',
                        opacity: isDone && !isToday ? 0.65 : 1,
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        if (!isToday) e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isToday ? 'var(--orange-dim)' : 'transparent';
                      }}
                    >
                      <span
                        className="font-bold text-sm"
                        style={{ color: 'var(--orange)', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        Day {q.dayNumber}
                      </span>

                      <span className="text-sm truncate pr-2" style={{ color: 'var(--text-1)' }}>
                        {q.title}
                      </span>

                      <span>
                        {q.difficulty ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: dc.bg, color: dc.color }}
                          >
                            {q.difficulty}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </span>

                      <span>
                        {isDone ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                            ✅ Done
                          </span>
                        ) : isToday ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'var(--orange-dim)', color: 'var(--orange)' }}>
                            📅 Today
                          </span>
                        ) : q.dayNumber > currentDay ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                            🔒 Locked
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </span>

                      <span>
                        {isDone ? (
                          /* Read-only solved badge — no manual marking required. */
                          <span
                            className="text-xs font-bold"
                            style={{ color: '#4ade80' }}
                            title={`Day ${q.dayNumber} solved`}
                          >
                            ✓ Solved
                          </span>
                        ) : q.dayNumber > currentDay ? (
                          /* Sequential unlock: a future day is locked until
                             the previous days are completed. Both "Open
                             Problem" and "Mark Solved" are disabled. */
                          <span
                            className="text-xs font-semibold cursor-not-allowed"
                            style={{ color: 'var(--text-3)' }}
                            title="Complete previous day first."
                          >
                            🔒 Locked
                          </span>
                        ) : getLeetCodeUrl(q) ? (
                          <button
                            onClick={() => {
                              window.open(getLeetCodeUrl(q), '_blank');
                            }}
                            className="cursor-pointer text-sm font-medium hover:underline transition-all"
                            style={{ color: 'var(--orange)' }}
                          >
                            Solve →
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 cursor-not-allowed">Unavailable</span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {questions.length === 0 && (
                  <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>
                    No questions loaded. Check your connection.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
