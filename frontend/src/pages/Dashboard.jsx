import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  FaCode as Code2, FaBookmark as Bookmark, FaCalendar as Calendar,
  FaArrowRight as ArrowRight, FaExternalLinkAlt as ExternalLink, FaCodeBranch as GitBranch,
  FaCheckCircle as CheckCircle2, FaExclamationCircle as AlertCircle, FaSpinner as Loader2,
  FaGithub as Github, FaFire as Flame, FaPuzzlePiece
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setUser } from '../store/authSlice';
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
   Extension Status Widget
───────────────────────────────────────────── */
function ExtensionStatusCard({ extensionConnected, handleReconnect }) {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const { data } = useQuery({
    queryKey: ['githubStats'],
    queryFn: () => apiClient.get('/api/github/stats').then((r) => r.data),
    staleTime: 30 * 1000,
  });

  const githubConnected = user?.githubConnected || false;
  const recentSubmissions = data?.recentSubmissions || [];

  // 1. Last sync details
  const lastSyncedTitle = recentSubmissions[0]?.questionTitle || 'None';
  const lastSyncedTime = recentSubmissions[0]?.submittedAt 
    ? timeAgo(recentSubmissions[0]?.submittedAt) 
    : 'Never';

  // 2. Auto Sync Status logic
  let autoSyncStatusText = 'Ready ✅';
  let autoSyncStatusClass = 'bg-green-500/10 text-green-400 border border-green-500/20';
  
  if (!extensionConnected) {
    autoSyncStatusText = 'Extension Missing ❌';
    autoSyncStatusClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
  } else if (!githubConnected) {
    autoSyncStatusText = 'Waiting Login ⚠️';
    autoSyncStatusClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }

  // 3. GitHub repository link
  const repoName = data?.repositoryName || 'company-preparation';
  const repoUrl = user?.githubUsername 
    ? `https://github.com/${user.githubUsername}/${repoName}`
    : '#';

  return (
    <div
      className="rounded-xl p-5 transition-all space-y-4"
      style={{ background: 'var(--bg-card, #0F0F1A)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
          <FaPuzzlePiece className="text-[#FF7A00]" size={15} /> Extension Status
        </h3>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${autoSyncStatusClass}`}>
          {autoSyncStatusText}
        </span>
      </div>

      {/* Warnings */}
      {!extensionConnected && (
        <div className="bg-red-950/20 border border-red-950/50 text-red-400 rounded-xl p-3 text-[11px] leading-relaxed">
          ⚠️ Auto-sync is inactive. Please install or enable the extension.
        </div>
      )}
      {extensionConnected && !githubConnected && (
        <div className="bg-amber-950/20 border border-amber-950/50 text-amber-400 rounded-xl p-3 text-[11px] leading-relaxed">
          ⚠️ Connect GitHub in settings to backup your code.
        </div>
      )}

      {/* Status Indicators */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Extension Installed</span>
          {extensionConnected ? (
            <span className="text-green-400 font-bold flex items-center gap-1">
              Connected ✅
            </span>
          ) : (
            <span className="text-red-400 font-bold flex items-center gap-1">
              Not Connected ❌
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">GitHub Status</span>
          {githubConnected ? (
            <span className="text-green-400 font-bold flex items-center gap-1">
              Connected ✅
            </span>
          ) : (
            <span className="text-red-400 font-bold flex items-center gap-1">
              Not Connected ❌
            </span>
          )}
        </div>
      </div>

      {/* Sync Performance Details */}
      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-2.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Last Synced Question</span>
          <span className="font-semibold text-white truncate max-w-[150px]" title={lastSyncedTitle}>
            {lastSyncedTitle}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last Sync Time</span>
          <span className="font-semibold text-gray-300">
            {lastSyncedTime}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <div className="flex gap-2">
          <a
            href={githubConnected ? repoUrl : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 py-2 text-center text-[10px] font-extrabold rounded-lg border transition flex items-center justify-center gap-1.5 ${
              githubConnected
                ? 'text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white'
                : 'text-gray-600 border-white/5 bg-transparent cursor-not-allowed pointer-events-none'
            }`}
          >
            Open Repository
          </a>
          <button
            onClick={() => navigate('/dashboard/dsa')}
            className="flex-1 py-2 text-center text-[10px] font-extrabold text-gray-300 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white rounded-lg transition"
          >
            Open Companies Page
          </button>
        </div>
        {!githubConnected && (
          <button
            onClick={handleReconnect}
            className="cursor-pointer w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 font-extrabold text-[10px] text-black rounded-lg transition text-center shadow shadow-[#FF7A00]/5"
          >
            Connect GitHub
          </button>
        )}
        {githubConnected && (
          <button
            onClick={handleReconnect}
            className="cursor-pointer w-full py-2 text-[10px] font-extrabold text-gray-400 hover:text-white bg-transparent hover:bg-white/5 border border-white/5 rounded-lg transition text-center"
          >
            Reconnect GitHub
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GitHub Sync Stats Card
───────────────────────────────────────────── */
function GitHubStatsCard(props) {
  console.log("GitHubStatsCard: Rendering. Props:", props);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['githubStats'],
    queryFn: () => apiClient.get('/api/github/stats').then((r) => {
      console.log("GitHubStatsCard: API GET /api/github/stats response:", r.data);
      return r.data;
    }),
    staleTime: 30 * 1000,
  });

  console.log("GitHubStatsCard: Query State:", { data, isLoading, error });

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5 animate-pulse space-y-4"
        style={{ background: 'var(--bg-card, #0F0F1A)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-700 animate-pulse" />
            <div className="w-24 h-4 rounded bg-gray-700 animate-pulse" />
          </div>
          <div className="w-16 h-5 rounded-full bg-gray-700 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded bg-gray-700 animate-pulse" />
          <div className="h-16 rounded bg-gray-700 animate-pulse" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 rounded bg-gray-700 w-2/3 animate-pulse" />
          <div className="h-3 rounded bg-gray-700 w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: 'var(--bg-card, #0F0F1A)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--red, #EF4444)' }}>
          Failed to load GitHub stats
        </p>
      </div>
    );
  }

  const {
    githubConnected = false,
    repositoryName = null,
    totalSolvedQuestions = 0,
    totalCompaniesCovered = 0,
    lastSyncAt = null,
    recentSubmissions = [],
  } = data;

  return (
    <div
      className="rounded-xl p-5 transition-all relative overflow-hidden"
      style={{
        background: 'var(--bg-card, #0F0F1A)',
        border: githubConnected
          ? '1px solid var(--orange-dim, rgba(249,115,22,0.15))'
          : '1px solid var(--border, rgba(255,255,255,0.06))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}
          >
            <Github size={16} className="text-slate-300" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-1, #F1F5F9)' }}>
            GitHub Sync
          </span>
        </div>

        {/* Status Badge */}
        {githubConnected ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green, #22C55E)' }}
          >
            <CheckCircle2 size={10} /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red, #EF4444)' }}
          >
            <AlertCircle size={10} /> Disconnected
          </span>
        )}
      </div>

      {/* Repo / Conn details */}
      {githubConnected ? (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono"
            style={{ background: 'var(--bg-hover, #141428)', color: 'var(--text-2, #94A3B8)' }}
          >
            <GitBranch size={12} className="text-slate-400 shrink-0" />
            <span className="truncate" title={repositoryName || 'company-preparation'}>
              {repositoryName || 'company-preparation'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--text-3, #475569)' }}>
          Connect your GitHub account in settings to automatically backup and sync your progress.
        </div>
      )}

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-1, #F1F5F9)' }}>
            {totalSolvedQuestions}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-3, #475569)' }}>
            Solved
          </p>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-1, #F1F5F9)' }}>
            {totalCompaniesCovered}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-3, #475569)' }}>
            Companies
          </p>
        </div>
      </div>

      {/* Last Sync */}
      {githubConnected && (
        <div className="flex items-center justify-between text-xs border-b pb-3 mb-3" style={{ borderColor: 'var(--border, rgba(255,255,255,0.06))' }}>
          <span style={{ color: 'var(--text-3, #475569)' }}>Last Sync Time</span>
          <span className="font-medium" style={{ color: 'var(--text-2, #94A3B8)' }}>
            {lastSyncAt ? timeAgo(lastSyncAt) : 'Not synced yet'}
          </span>
        </div>
      )}

      {/* Recent Push Activity */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2, #94A3B8)' }}>
          Recent Activity
        </p>
        {recentSubmissions.length === 0 ? (
          <p className="text-xs py-3 text-center" style={{ color: 'var(--text-3, #475569)' }}>
            No recent activity
          </p>
        ) : (
          <div className="space-y-2">
            {recentSubmissions.slice(0, 3).map((sub) => (
              <div key={sub._id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-medium truncate" style={{ color: 'var(--text-1, #F1F5F9)' }}>
                    {sub.questionTitle}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3, #475569)' }}>
                    {sub.company} • <span className="uppercase">{sub.language}</span>
                  </p>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-3, #475569)' }}>
                  {timeAgo(sub.submittedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Link
        to="/profile/github"
        className="text-center font-bold text-xs text-[#FF7A00] hover:text-[#FFB800] transition duration-200 mt-4 block border-t border-white/5 pt-3"
      >
        View Integration Details →
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
const SIDEBAR_W = 220;

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);
  
  const [extensionConnected, setExtensionConnected] = useState(false);

  // 1. Extension Handshake: Poll every 2 seconds for presence of companion extension
  useEffect(() => {
    let lastPongReceived = 0;
    
    const handlePongMessage = (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'CODEPREP_PONG') {
        setExtensionConnected(true);
        lastPongReceived = Date.now();
      }
    };

    window.addEventListener('message', handlePongMessage);

    // Initial ping
    window.postMessage({ type: 'CODEPREP_PING' }, '*');

    // Interval to send ping and check for timeout
    const interval = setInterval(() => {
      window.postMessage({ type: 'CODEPREP_PING' }, '*');
      
      // If we received a pong, and it has been more than 5 seconds since the last pong, set disconnected
      if (lastPongReceived > 0 && Date.now() - lastPongReceived > 5000) {
        setExtensionConnected(false);
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handlePongMessage);
      clearInterval(interval);
    };
  }, []);

  // 3. Listen for mock OAuth success messages from GitHub popup window
  useEffect(() => {
    const handleOAuthMessage = async (event) => {
      if (event.data?.type === 'oauth-success' && event.data?.provider === 'github') {
        try {
          console.log('[Dashboard] GitHub OAuth succeeded. Syncing user profile details...');
          const profileRes = await apiClient.get('/api/auth/me');
          dispatch(setUser(profileRes.data));
          queryClient.invalidateQueries(['githubStats']);
          queryClient.invalidateQueries(['dashboard']);
        } catch (err) {
          console.error('[Dashboard] Failed to sync profile details:', err);
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [dispatch, queryClient]);

  const handleReconnectGithub = () => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');
    const connectUrl = `${baseUrl}/api/auth/github?token=${token}`;
    window.open(connectUrl, 'GitHub Connect', 'width=600,height=600');
  };

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
              {user && !user.isOnboarded && (
                <div className="mx-6 mt-6 bg-amber-950/15 border border-amber-900/30 rounded-xl p-4 text-xs text-amber-400 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    Complete setup to enable automatic sync.
                  </span>
                  <Link
                    to="/onboarding"
                    className="cursor-pointer text-[10px] font-extrabold text-black bg-gradient-to-r from-[#FF7A00] to-[#FFB800] px-3 py-1.5 rounded-lg transition hover:opacity-90 shrink-0 uppercase"
                  >
                    Complete Setup
                  </Link>
                </div>
              )}

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

                  {/* Right: Daily Challenge, Extension Status & GitHub Stats */}
                  <div className="lg:col-span-1 space-y-6">
                    <GVChallengeCard streak={streak} />
                    <ExtensionStatusCard
                      extensionConnected={extensionConnected}
                      handleReconnect={handleReconnectGithub}
                    />
                    <GitHubStatsCard />
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
