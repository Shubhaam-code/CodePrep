import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight } from "react-icons/fa6";
import {
  FaCode as Code2, FaBookmark as Bookmark, FaCalendar as Calendar,
  FaArrowRight as ArrowRight, FaExternalLinkAlt as ExternalLink,
  FaCheckCircle as CheckCircle2, FaExclamationCircle as AlertCircle,
  FaSpinner as Loader2, FaGithub as Github, FaFire as Flame, FaPuzzlePiece
} from 'react-icons/fa';
import apiClient from '../api/axios';
import { useAppSelector, useAppDispatch } from '../store/store';
import Sidebar from '../components/dashboard/Sidebar';
import { openGitHubOAuthPopup } from '../utils/githubOAuth';

// ─── Design tokens (match GVChallenge & GitHub Integration) ───────────────────
const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLastActive(dateStr) {
  if (!dateStr) return 'First Login';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    const isToday = d.toDateString() === now.toDateString();
    if (diffHours < 12) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (isToday) {
      return `Today, ${formatTime(d)}`;
    }
  }

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Today, ${formatTime(d)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isYesterday) {
    return `Yesterday, ${formatTime(d)}`;
  }

  const isSameYear = d.getFullYear() === now.getFullYear();
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  if (isSameYear) {
    return `${day} ${month}, ${formatTime(d)}`;
  } else {
    const year = d.getFullYear();
    return `${day} ${month} ${year}, ${formatTime(d)}`;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins || 1}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function diffColor(difficulty) {
  if (!difficulty) return '#94A3B8';
  const d = difficulty.toLowerCase();
  if (d === 'easy') return '#22c55e';
  if (d === 'medium') return '#fbbf24';
  return '#ef4444';
}

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

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, sublabel, value, isString, color, dot, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="flex items-center gap-4 rounded-xl px-5 py-4"
      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,107,26,0.25)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(255,107,26,0.05)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e1e1e';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-black text-white truncate" style={{ letterSpacing: '-0.04em' }}>
            {isString ? value : <AnimatedCounter value={value} />}
          </span>
          <span className="text-[10px]" style={{ color: '#4b5563' }}>{sublabel}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Gradient Progress Bar ────────────────────────────────────────────────────
const GradientBar = memo(function GradientBar({ pct }) {
  return (
    <div className="relative rounded-full overflow-hidden w-full" style={{ height: 4, backgroundColor: '#1a1a1a' }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-[#FF6B1A]"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
});

// ─── New User Welcome ────────────────────────────────────────────────────────
const TOP_COMPANIES = [
  { name: 'Google', color: '#4285F4' },
  { name: 'Amazon', color: '#FF9900' },
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto mt-8 rounded-2xl p-8 text-center relative"
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
        boxShadow: '0 0 0 1px rgba(255,107,26,0.06), 0 20px 40px rgba(0,0,0,0.3)',
      }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: ORANGE }} />

      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.25)' }}
      >
        <Code2 size={24} style={{ color: ORANGE }} />
      </div>

      <h2 className="text-2xl font-black text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
        Welcome, {user?.name?.split(' ')[0] || 'Engineer'}! 👋
      </h2>
      <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: '#6b7280', lineHeight: 1.6 }}>
        Start your coding prep path. Pick a top tech giant below or browse all companies to begin solving questions.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {TOP_COMPANIES.map((co) => (
          <button
            key={co.name}
            onClick={() => navigate('/company/' + co.name.toLowerCase())}
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl cursor-pointer transition-all duration-200"
            style={{ backgroundColor: '#0d0d0d', border: '1px solid #1c1c1c' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,107,26,0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1c1c1c';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base"
              style={{ backgroundColor: co.color }}
            >
              {co.name[0]}
            </div>
            <span className="text-xs font-bold text-white leading-none">{co.name}</span>
            <span className="text-[10px]" style={{ color: '#4b5563' }}>
              {companiesData ? 'Questions →' : 'Loading...'}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/dashboard/dsa')}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
        style={{
          background: `linear-gradient(135deg, ${ORANGE}, #ff9a1a)`,
          border: 'none',
          boxShadow: '0 4px 16px rgba(255,107,26,0.25)',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,26,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,107,26,0.25)';
        }}
      >
        Browse All Companies <FaArrowRight size={12} />
      </button>
    </motion.div>
  );
}

// ─── GV Challenge promo card ─────────────────────────────────────────────
function GVChallengeCard({ streak }) {
  const navigate = useNavigate();
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255,107,26,0.18)',
        boxShadow: '0 0 24px rgba(255,107,26,0.04)',
      }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: ORANGE }} />

      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase"
          style={{ backgroundColor: 'rgba(255,107,26,0.1)', color: ORANGE, border: '1px solid rgba(255,107,26,0.25)' }}
        >
          🏆 GV Challenge
        </span>

        {/* Streak */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-white">
            🔥 {streak?.current || 0}
          </span>
          <span className="text-[9px] uppercase font-bold" style={{ color: '#4b5563' }}>streak</span>
        </div>
      </div>

      <h4 className="font-black text-white text-[15px] mb-1.5 leading-snug" style={{ letterSpacing: '-0.02em' }}>
        Daily DSA. Auto-Backed.
      </h4>
      <p className="text-[12px] mb-4 leading-relaxed" style={{ color: '#6b7280' }}>
        Solve one curated question daily. accepted solutions auto-sync directly to your connected GitHub repositories.
      </p>

      <button
        onClick={() => navigate('/dashboard/gvchallenge')}
        className="w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, ${ORANGE}, #ff9a1a)`,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255,107,26,0.2)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(255,107,26,0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,26,0.2)';
        }}
      >
        Start Today's Challenge
      </button>
    </div>
  );
}

// ─── Extension Status Widget ─────────────────────────────────────────────
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

  const lastSyncedTitle = recentSubmissions[0]?.questionTitle || 'None';
  const lastSyncedTime = recentSubmissions[0]?.submittedAt
    ? timeAgo(recentSubmissions[0]?.submittedAt)
    : 'Never';

  let autoSyncStatusText = 'Ready';
  let autoSyncStatusClass = 'bg-green-500/10 text-green-400 border border-green-500/20';

  if (!extensionConnected) {
    autoSyncStatusText = 'Extension Inactive';
    autoSyncStatusClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
  } else if (!githubConnected) {
    autoSyncStatusText = 'Setup Incomplete';
    autoSyncStatusClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }

  const repoUrl = data?.repositoryUrl || user?.githubRepositoryUrl || '';

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-3.5">
        <h3 className="text-white font-black text-sm flex items-center gap-2">
          <FaPuzzlePiece className="text-[#FF6B1A]" size={14} /> Extension Status
        </h3>
        <span className={`inline-flex items-center text-[9px] font-black tracking-wider px-2 py-0.5 rounded-lg uppercase ${autoSyncStatusClass}`}>
          {autoSyncStatusText}
        </span>
      </div>

      {/* Warning Banners */}
      {!extensionConnected && (
        <div
          className="rounded-xl p-3 text-[11px] leading-relaxed"
          style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          Auto-sync is inactive. Please install or enable the LeetCode Companion Extension to sync progress.
        </div>
      )}
      {extensionConnected && !githubConnected && (
        <div
          className="rounded-xl p-3 text-[11px] leading-relaxed"
          style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b' }}
        >
          Connect your GitHub account in configuration settings to trigger automatic backups.
        </div>
      )}

      {/* Status Details */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold" style={{ color: '#4b5563' }}>Extension Installed</span>
          {extensionConnected ? (
            <span className="text-green-400 font-bold">Connected ✓</span>
          ) : (
            <span className="text-red-400 font-bold">Not Connected ✗</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold" style={{ color: '#4b5563' }}>GitHub Integration</span>
          {githubConnected ? (
            <span className="text-green-400 font-bold">Connected ✓</span>
          ) : (
            <span className="text-red-400 font-bold">Not Connected ✗</span>
          )}
        </div>
      </div>

      {/* Sync stats card */}
      <div className="rounded-xl p-3.5 space-y-2.5 text-xs" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1c1c1c' }}>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Last Synced</span>
          <span className="font-bold text-white truncate max-w-[160px]" title={lastSyncedTitle}>
            {lastSyncedTitle}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Time Elapsed</span>
          <span className="font-semibold text-gray-300">{lastSyncedTime}</span>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2 border-t border-[#1e1e1e] space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => githubConnected && repoUrl ? window.open(repoUrl, '_blank', 'noopener,noreferrer') : null}
            disabled={!githubConnected || !repoUrl}
            className="flex-1 py-2 text-center text-[10px] font-bold rounded-lg border transition flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: githubConnected && repoUrl ? '#1a1a1a' : 'transparent',
              borderColor: githubConnected && repoUrl ? '#2a2a2a' : '#161616',
              color: githubConnected && repoUrl ? '#9ca3af' : '#2d2d2d',
              cursor: githubConnected && repoUrl ? 'pointer' : 'not-allowed',
            }}
          >
            Open Repo
          </button>
          <button
            onClick={() => navigate('/dashboard/dsa')}
            className="flex-1 py-2 text-center text-[10px] font-bold text-gray-300 border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#222] hover:text-white rounded-lg transition cursor-pointer"
          >
            All Companies
          </button>
        </div>
        {!githubConnected ? (
          <button
            onClick={handleReconnect}
            className="w-full py-2.5 font-bold text-[10px] text-white rounded-lg transition text-center cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff9a1a)`, border: 'none' }}
          >
            Connect GitHub
          </button>
        ) : (
          <button
            onClick={handleReconnect}
            className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-white bg-transparent hover:bg-white/5 border border-[#2a2a2a] rounded-lg transition text-center cursor-pointer"
          >
            Reconnect GitHub
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);

  const [extensionConnected, setExtensionConnected] = useState(false);

  // Poll companion extension presence
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
    window.postMessage({ type: 'CODEPREP_PING' }, '*');

    const interval = setInterval(() => {
      window.postMessage({ type: 'CODEPREP_PING' }, '*');
      if (lastPongReceived > 0 && Date.now() - lastPongReceived > 5000) {
        setExtensionConnected(false);
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handlePongMessage);
      clearInterval(interval);
    };
  }, []);

  const handleReconnectGithub = () => {
    openGitHubOAuthPopup({
      dispatch,
      queryClient,
      onError: (message) => console.error('[Dashboard] GitHub OAuth failed:', message),
      onClosed: () => console.warn('[Dashboard] GitHub OAuth popup closed before completion.'),
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/api/user/dashboard').then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const {
    totalSolved = 0,
    totalBookmarked = 0,
    streak = {},
    solvedByCompany = [],
    recentSolved = [],
    lastActiveDate = null,
  } = data || {};

  const isNewUser = !isLoading && totalSolved === 0;

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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
                System Overview
              </span>
            </div>
            {user && !user.isOnboarded && (
              <Link
                to="/onboarding"
                className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                ● Complete Setup Setup
              </Link>
            )}
          </div>

          <div className="space-y-2">
            <h1
              className="font-black leading-none tracking-tight"
              style={{ fontSize: 'clamp(34px, 3.5vw, 48px)', color: '#ffffff', letterSpacing: '-0.03em' }}
            >
              System
              <span style={{ color: ORANGE }}> Overview</span>
            </h1>
            <p className="text-base font-normal max-w-xl" style={{ color: '#6b7280', lineHeight: 1.6 }}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}! Track your progress, streak, and recent backup synchronizations in one workspace.
            </p>
          </div>
        </header>

        {/* ── Page contents ── */}
        <main className="flex-1 px-10 py-8 space-y-8">
          {isLoading ? (
            <>
              {/* Skeleton loading row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', height: '84px' }}
                  />
                ))}
              </div>

              {/* Skeleton widgets grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl" style={{ backgroundColor: '#111111', height: '240px', border: '1px solid #1e1e1e' }} />
                  <div className="rounded-xl" style={{ backgroundColor: '#111111', height: '300px', border: '1px solid #1e1e1e' }} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <div className="rounded-xl" style={{ backgroundColor: '#111111', height: '180px', border: '1px solid #1e1e1e' }} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── STATS ROW ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Code2} label="Questions Solved" sublabel="all-time" value={totalSolved} color={ORANGE} delay={0.05} />
                <StatCard icon={Flame} label="Day Streak 🔥" sublabel="current streak" value={streak?.current || 0} color="#f59e0b" delay={0.10} />
                <StatCard icon={Bookmark} label="Bookmarks" sublabel="saved questions" value={totalBookmarked} color="#8b5cf6" delay={0.15} />
                <StatCard icon={Calendar} label="Last Active" value={formatLastActive(lastActiveDate)} isString color="#22c55e" delay={0.20} />
              </div>

              {isNewUser ? (
                <NewUserWelcome user={user} />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (Recent Activity + Company Progress) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Recent Activity */}
                    <div
                      className="rounded-2xl p-5"
                      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-[#1e1e1e] pb-3">
                        <h3 className="font-black text-white text-sm" style={{ letterSpacing: '-0.02em' }}>
                          Recent Synced Activity
                        </h3>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#1a1a1a] text-[#4b5563]">
                          LATEST
                        </span>
                      </div>

                      {recentSolved.length === 0 ? (
                        <p className="text-sm py-8 text-center" style={{ color: '#4b5563' }}>
                          No activity synced yet. Practice a company question to begin.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#181818]">
                          {recentSolved.slice(0, 5).map((item, i) => (
                            <div key={item._id || i} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-1">
                              {/* Difficulty dot */}
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: diffColor(item.difficulty) }}
                              />

                              {/* Details */}
                              <div className="flex-1 overflow-hidden min-w-0">
                                <a
                                  href={item.leetcodeUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-white hover:text-orange-400 block truncate transition-colors"
                                >
                                  {item.title}
                                </a>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#161616] border border-[#222] font-semibold text-gray-500 capitalize">
                                    {item.company}
                                  </span>
                                  <span className="text-[10px] ml-auto font-mono text-gray-600">
                                    {timeAgo(item.solvedAt)}
                                  </span>
                                </div>
                              </div>

                              <ExternalLink size={10} style={{ color: '#2d2d2d', flexShrink: 0 }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Company Progress */}
                    <div
                      className="rounded-2xl p-5"
                      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
                    >
                      <div className="flex items-center justify-between mb-5 border-b border-[#1e1e1e] pb-3">
                        <h3 className="font-black text-white text-sm" style={{ letterSpacing: '-0.02em' }}>
                          Company Progress metrics
                        </h3>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#1a1a1a] text-[#4b5563]">
                          METRICS
                        </span>
                      </div>

                      {solvedByCompany.length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: '#4b5563' }}>
                          Practice a target company to view detailed progress indicators here.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {solvedByCompany.slice(0, 5).map((co) => {
                            const pct = co.total > 0 ? (co.solved / co.total) * 100 : 0;
                            return (
                              <div key={co.company} className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-white capitalize leading-none">
                                    {co.company}
                                  </span>
                                  <span className="font-semibold text-gray-500">
                                    {co.solved} / {co.total || '?'} solved
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <GradientBar pct={pct} />
                                  <button
                                    onClick={() => navigate('/company/' + co.company)}
                                    className="text-[10px] font-bold transition-opacity hover:opacity-85 cursor-pointer flex-shrink-0"
                                    style={{ color: ORANGE }}
                                  >
                                    Continue →
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Challenge + Extension) */}
                  <div className="lg:col-span-1 space-y-6">
                    <GVChallengeCard streak={streak} />
                    <ExtensionStatusCard
                      extensionConnected={extensionConnected}
                      handleReconnect={handleReconnectGithub}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-5 flex items-center justify-between" style={{ borderTop: '1px solid #141414' }}>
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — Dashboard Overview
          </span>
        </footer>
      </div>
    </div>
  );
}
