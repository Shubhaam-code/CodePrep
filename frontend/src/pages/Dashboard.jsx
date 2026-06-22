import { useQuery } from '@tanstack/react-query';
import { motion, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import {
  Code2, Flame, Bookmark, Calendar,
  ArrowRight, ExternalLink,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useAppSelector } from '../store/store';
import Sidebar from '../components/dashboard/Sidebar';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLastActive(dateStr) {
  if (!dateStr) return 'Not started';
  const d = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === todayStr) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins || 1}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function diffColor(difficulty) {
  if (!difficulty) return '#94A3B8';
  const d = difficulty.toLowerCase();
  if (d === 'easy')   return '#4ade80';
  if (d === 'medium') return '#fbbf24';
  return '#f87171';
}

/* ─────────────────────────────────────────────
   Animated counter hook
───────────────────────────────────────────── */
function AnimatedNumber({ value, className }) {
  const ref   = useRef(null);
  const mvRef = useRef(null);

  useEffect(() => {
    const ctrl = animate(0, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => ctrl.stop();
  }, [value]);

  return <span ref={ref} className={className}>0</span>;
}

/* ─────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────── */
function StatCard({ icon: Icon, label, sublabel, value, isString, color, dot }) {
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: 'var(--border-hover, rgba(255,255,255,0.12))' }}
      transition={{ duration: 0.2 }}
      className="rounded-xl p-5 transition-all"
      style={{ background: 'var(--bg-card, #0F0F1A)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={17} style={{ color }} />
        </div>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: dot || color }} />
      </div>

      <div className="mt-4">
        {isString ? (
          <p className="text-2xl font-extrabold leading-tight" style={{ color: 'var(--text-1, #F1F5F9)' }}>
            {value}
          </p>
        ) : (
          <AnimatedNumber
            value={typeof value === 'number' ? value : 0}
            className="text-2xl font-extrabold leading-tight"
          />
        )}
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-2, #94A3B8)' }}>{label}</p>
        <p className="text-xs mt-0.5"        style={{ color: 'var(--text-3, #475569)'  }}>{sublabel}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Animated progress bar
───────────────────────────────────────────── */
function ProgressBar({ pct }) {
  return (
    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover, #141428)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
        className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg, var(--orange,#F97316), var(--orange-dim,#fbbf24))' }}
      />
    </div>
  );
}



/* ─────────────────────────────────────────────
   New-user welcome state
───────────────────────────────────────────── */
const TOP_COMPANIES = [
  { name: 'Google',    color: '#4285F4' },
  { name: 'Amazon',    color: '#FF9900' },
  { name: 'Microsoft', color: '#00A4EF' },
];

function NewUserWelcome({ user }) {
  const navigate = useNavigate();
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient.get('/api/companies').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="max-w-2xl mx-auto mt-8 rounded-2xl p-10 text-center"
      style={{ background: 'var(--bg-card, #0F0F1A)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'var(--orange-dim, rgba(249,115,22,0.12))', border: '1px solid var(--orange-glow, rgba(249,115,22,0.2))' }}
      >
        <Code2 size={28} style={{ color: 'var(--orange, #F97316)' }} />
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-1, #F1F5F9)' }}>
        Welcome, {user?.name?.split(' ')[0] || 'Engineer'}! 👋
      </h2>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-2, #94A3B8)' }}>
        Pick a company to kick off your interview prep journey.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {TOP_COMPANIES.map((co) => (
          <motion.button
            key={co.name}
            whileHover={{ y: -3, borderColor: 'rgba(249,115,22,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/company/' + co.name.toLowerCase())}
            className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all"
            style={{ background: 'var(--bg-hover, #141428)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-lg"
              style={{ background: co.color }}
            >
              {co.name[0]}
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-1, #F1F5F9)' }}>{co.name}</span>
            <span className="text-xs" style={{ color: 'var(--text-3, #475569)' }}>
              {companiesData ? 'Questions →' : '...'}
            </span>
          </motion.button>
        ))}
      </div>

      <button
        onClick={() => navigate('/dashboard/dsa')}
        className="cursor-pointer w-full py-3 rounded-xl font-semibold text-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, var(--orange,#F97316), var(--secondary,#FFB800))' }}
      >
        Browse All Companies <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   GV Challenge promo card
───────────────────────────────────────────── */
function GVChallengeCard({ streak }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl p-5 h-full"
      style={{
        background:  'linear-gradient(135deg, var(--bg-card,#0F0F1A), var(--bg-hover,#141428))',
        border:      '1px solid var(--orange-dim, rgba(249,115,22,0.15))',
      }}
    >
      <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-5"
        style={{ background: 'var(--orange-dim,rgba(249,115,22,0.12))', color: 'var(--orange,#F97316)' }}
      >
        🏆 GV Challenge
      </span>

      <p className="font-semibold mb-2 leading-snug" style={{ color: 'var(--text-1,#F1F5F9)' }}>
        Code. Push. Post. Repeat.
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-3,#475569)' }}>
        Solve daily DSA questions, push to GitHub with LeetHub, and share on LinkedIn.
      </p>
      <button
        onClick={() => navigate('/dashboard/gvchallenge')}
        className="cursor-pointer w-full py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, var(--orange,#F97316), var(--secondary,#FFB800))' }}
      >
        Start Today's Challenge →
      </button>

      {/* Streak */}
      <div className="mt-5 text-center">
        <p
          className="text-4xl font-black leading-none"
          style={{
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🔥 {streak?.current || 0}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3, #475569)' }}>day streak</p>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
const SIDEBAR_W = 220;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user }  = useAppSelector((s) => s.auth);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/api/user/dashboard').then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const {
    totalSolved     = 0,
    totalBookmarked = 0,
    streak          = {},
    solvedByCompany = [],
    recentSolved    = [],
    lastActiveDate  = null,
  } = data || {};

  const isNewUser = !isLoading && totalSolved === 0;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary, #07070F)' }}>
      <Sidebar />

      {/* ── Main scroll area ── */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: SIDEBAR_W }}
      >
        {/* ── Top bar ── */}
        <div
          className="sticky top-0 z-30 h-14 px-6 flex items-center justify-between shrink-0"
          style={{
            background:   'var(--bg-primary, #07070F)',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
          }}
        >
          <div>
            <h1 className="font-semibold text-lg leading-tight" style={{ color: 'var(--text-1, #F1F5F9)' }}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Engineer'} 👋
            </h1>
          </div>
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white uppercase select-none cursor-default"
            style={{ background: 'var(--orange, #F97316)' }}
            title={user?.name || 'User'}
          >
            {(user?.name || 'U')[0]}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto pb-10">
          {isLoading ? (
            /* Loading skeleton */
            <div className="px-6 pt-6 grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl p-5 animate-pulse"
                  style={{ background: 'var(--bg-card,#0F0F1A)', height: '120px' }} />
              ))}
            </div>
          ) : (
            <>
              {/* ── Stats row ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 pt-6">
                <StatCard
                  icon={Code2}     label="Questions Solved"  sublabel="All-time total"
                  value={totalSolved}        color="#F97316"  dot="#F97316"
                />
                <StatCard
                  icon={Flame}     label="Day Streak 🔥"    sublabel="Consecutive days"
                  value={streak?.current || 0} color="#F97316" dot="#F97316"
                />
                <StatCard
                  icon={Bookmark}  label="Bookmarks"         sublabel="Saved questions"
                  value={totalBookmarked}    color="#8B5CF6"  dot="#8B5CF6"
                />
                <StatCard
                  icon={Calendar}  label="Last Active"       sublabel="Last activity"
                  value={formatLastActive(lastActiveDate)}
                  isString color="#22C55E"  dot="#22C55E"
                />
              </div>

              {/* ── New user welcome or returning user content ── */}
              {isNewUser ? (
                <div className="px-6">
                  <NewUserWelcome user={user} />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 mt-6">

                  {/* Left: Recent + Company Progress */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* Recent Activity */}
                    <div className="rounded-xl p-5"
                      style={{ background: 'var(--bg-card,#0F0F1A)', border: '1px solid var(--border,rgba(255,255,255,0.06))' }}
                    >
                      <p className="font-semibold mb-4" style={{ color: 'var(--text-1,#F1F5F9)' }}>
                        Recent Activity
                      </p>

                      {recentSolved.length === 0 ? (
                        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3,#475569)' }}>
                          No activity yet. Start practicing!
                        </p>
                      ) : (
                        <div>
                          {recentSolved.slice(0, 5).map((item, i) => (
                            <div
                              key={item._id || i}
                              className="flex items-center gap-3 py-3"
                              style={{
                                borderBottom: i < Math.min(recentSolved.length, 5) - 1
                                  ? '1px solid var(--border,rgba(255,255,255,0.06))'
                                  : 'none',
                              }}
                            >
                              {/* Difficulty dot */}
                              <div className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: diffColor(item.difficulty), marginTop: 2 }} />

                              {/* Title + meta */}
                              <div className="flex-1 overflow-hidden">
                                <a
                                  href={item.leetcodeUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium block truncate transition-colors hover:text-orange-400"
                                  style={{ color: 'var(--text-1,#F1F5F9)' }}
                                >
                                  {item.title}
                                </a>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs px-2 py-0.5 rounded capitalize"
                                    style={{ background: 'var(--bg-hover,#141428)', color: 'var(--text-3,#475569)' }}
                                  >
                                    {item.company}
                                  </span>
                                  <span className="text-xs ml-auto" style={{ color: 'var(--text-3,#475569)' }}>
                                    {timeAgo(item.solvedAt)}
                                  </span>
                                </div>
                              </div>

                              <ExternalLink size={12} style={{ color: 'var(--text-3,#475569)', flexShrink: 0 }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Company Progress */}
                    <div className="rounded-xl p-5"
                      style={{ background: 'var(--bg-card,#0F0F1A)', border: '1px solid var(--border,rgba(255,255,255,0.06))' }}
                    >
                      <p className="font-semibold mb-5" style={{ color: 'var(--text-1,#F1F5F9)' }}>
                        Company Progress
                      </p>

                      {solvedByCompany.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-3,#475569)' }}>
                          Practice a company to see progress here.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {solvedByCompany.slice(0, 8).map((co) => {
                            const pct = co.total > 0 ? (co.solved / co.total) * 100 : 0;
                            return (
                              <div key={co.company}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium capitalize"
                                    style={{ color: 'var(--text-1,#F1F5F9)' }}
                                  >
                                    {co.company}
                                  </span>
                                  <span className="text-xs" style={{ color: 'var(--text-3,#475569)' }}>
                                    {co.solved}/{co.total || '?'}
                                  </span>
                                </div>
                                <ProgressBar pct={pct} />
                                <button
                                  onClick={() => navigate('/company/' + co.company)}
                                  className="cursor-pointer text-xs mt-1 transition-opacity hover:opacity-80"
                                  style={{ color: 'var(--orange,#F97316)' }}
                                >
                                  Continue →
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Daily Challenge */}
                  <div className="lg:col-span-1">
                    <GVChallengeCard streak={streak} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
