import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/store';
import apiClient from '../api/axios';
import { openGitHubOAuthPopup } from '../utils/githubOAuth';
import Sidebar from '../components/dashboard/Sidebar';
import { getRepoDisplayName } from '../utils/repoMapper';
import {
  FaGithub, FaUser, FaCode, FaTrophy, FaClock, FaExternalLinkAlt,
  FaSpinner, FaCheckCircle, FaExclamationCircle, FaFire,
  FaCodeBranch, FaSync, FaBoxOpen, FaLayerGroup, FaStar
} from 'react-icons/fa';

// ─── Design tokens (match GVChallenge) ────────────────────────────────────────
const SIDEBAR_W = 220;
const ORANGE = '#FF6B1A';

function timeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Animated stat number ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, delay = 0 }) {
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
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#4b5563' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-2xl font-black text-white" style={{ letterSpacing: '-0.04em' }}>
            {value ?? '—'}
          </span>
          {sub && <span className="text-xs font-medium" style={{ color: '#4b5563' }}>{sub}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Repository card ──────────────────────────────────────────────────────────
function RepoCard({ slug, profileUrl, delay = 0 }) {
  const displayName = getRepoDisplayName(slug);
  const repoUrl = profileUrl && slug ? `${profileUrl.replace(/\/$/, '')}/${slug}` : '#';

  const iconMap = {
    'company-preparation': { icon: '🏢', color: '#3b82f6' },
    'general-prep': { icon: '📐', color: '#22c55e' },
    'gv-challenge': { icon: '🏆', color: ORANGE },
  };
  const meta = iconMap[slug] || { icon: '📁', color: '#6b7280' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="group rounded-xl p-4 transition-all duration-200"
      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,107,26,0.3)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e1e1e';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ backgroundColor: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-[13px] font-bold text-white leading-tight">{displayName}</p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: '#4b5563' }}>{slug}</p>
          </div>
        </div>
        <button
          onClick={() => window.open(repoUrl, '_blank', 'noopener,noreferrer')}
          className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#6b7280', cursor: 'pointer' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = ORANGE;
            e.currentTarget.style.backgroundColor = 'rgba(255,107,26,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#6b7280';
            e.currentTarget.style.borderColor = '#2a2a2a';
            e.currentTarget.style.backgroundColor = '#1a1a1a';
          }}
        >
          <FaExternalLinkAlt size={9} /> Open
        </button>
      </div>
    </motion.div>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────
function ActivityItem({ sub, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="flex items-start gap-4 py-4"
      style={{ borderBottom: '1px solid #141414' }}
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: ORANGE }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white truncate">{sub.questionTitle}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {sub.company && (
                <span className="text-[11px] font-medium" style={{ color: '#6b7280' }}>
                  {sub.company}
                </span>
              )}
              {sub.language && (
                <span
                  className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md uppercase"
                  style={{ backgroundColor: '#1a1a1a', color: '#6b7280', border: '1px solid #222' }}
                >
                  {sub.language}
                </span>
              )}
              <span
                className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md"
                style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                ✓ Synced
              </span>
            </div>
          </div>
          <span className="flex-shrink-0 text-[11px] font-mono" style={{ color: '#3d3d3d' }}>
            {timeAgo(sub.submittedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GitHubProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);
  const [oauthMessage, setOauthMessage] = useState('');
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['githubProfileStats'],
    queryFn: async () => {
      const res = await apiClient.get('/api/github/stats');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const handleReconnect = () => {
    setOauthMessage('');
    setIsConnectingGithub(true);
    openGitHubOAuthPopup({
      dispatch,
      queryClient,
      onSuccess: () => {
        setIsConnectingGithub(false);
        setOauthMessage('GitHub connected successfully.');
        refetch();
      },
      onError: (message) => {
        setIsConnectingGithub(false);
        setOauthMessage(message);
      },
      onClosed: () => {
        setIsConnectingGithub(false);
        setOauthMessage('GitHub connection was cancelled before authorization completed.');
      },
    });
  };

  const username = user?.githubUsername || 'Not connected';
  const profileUrl = user?.githubProfileUrl || (user?.githubUsername ? `https://github.com/${user.githubUsername}` : '#');
  const isConnected = data?.githubConnected || false;

  return (
    <div
      className="min-h-screen text-white antialiased select-none"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_W }}>

        {/* ── HERO HEADER ── */}
        <header className="px-10 pt-10 pb-8" style={{ borderBottom: '1px solid #141414' }}>
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FaGithub size={13} style={{ color: ORANGE }} />
              <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4b5563' }}>
                GitHub Integration
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <span
                  className="text-[10px] font-bold tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  ● GITHUB CONNECTED
                </span>
              ) : (
                <span
                  className="text-[10px] font-bold tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  ● NOT CONNECTED
                </span>
              )}
            </div>
          </div>

          {/* Hero title */}
          <div className="space-y-2">
            <h1
              className="font-black leading-none tracking-tight"
              style={{ fontSize: 'clamp(34px, 3.5vw, 48px)', color: '#ffffff', letterSpacing: '-0.03em' }}
            >
              GitHub
              <span style={{ color: ORANGE }}> Integration</span>
            </h1>
            <p className="text-base font-normal max-w-xl" style={{ color: '#6b7280', lineHeight: 1.6 }}>
              Automatically sync your accepted LeetCode solutions directly to GitHub repositories. All progress, publicly tracked.
            </p>
          </div>

          {/* oAuth banner */}
          <AnimatePresence>
            {oauthMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 px-4 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
              >
                {oauthMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ── PAGE BODY ── */}
        <main className="flex-1 px-10 py-8 space-y-8">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <FaSpinner size={24} style={{ color: ORANGE }} className="animate-spin" />
              <p className="text-[13px] font-medium" style={{ color: '#4b5563' }}>Loading GitHub details…</p>
            </div>
          ) : isError ? (
            <div
              className="p-8 rounded-2xl text-center text-sm font-semibold"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
            >
              Failed to load GitHub statistics: {error?.message || 'Unknown error'}
            </div>
          ) : (
            <>
              {/* ── STATS ROW ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FaCodeBranch} iconBg="#0d1a2e" iconColor="#3b82f6" label="Repositories" value={data?.availableRepositories?.length || 0} sub="synced" delay={0.05} />
                <StatCard icon={FaCode} iconBg="#1a1a1a" iconColor={ORANGE} label="Questions Synced" value={data?.totalSolvedQuestions || 0} sub="total" delay={0.10} />
                <StatCard icon={FaLayerGroup} iconBg="#0d2218" iconColor="#22c55e" label="Companies" value={data?.totalCompaniesCovered || 0} sub="covered" delay={0.15} />
                <StatCard icon={FaClock} iconBg="#1c1005" iconColor="#f59e0b" label="Last Sync" value={data?.lastSyncAt ? timeAgo(data.lastSyncAt) : 'Never'} delay={0.20} />
              </div>

              {/* ── CONNECTION CARD + RECONNECT CTA ── */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#111111',
                  border: isConnected ? '1px solid rgba(34,197,94,0.18)' : `1px solid rgba(255,107,26,0.2)`,
                  boxShadow: isConnected
                    ? '0 0 40px rgba(34,197,94,0.04)'
                    : `0 0 40px rgba(255,107,26,0.06)`,
                }}
              >
                {/* Top accent */}
                <div
                  className="absolute top-0 inset-x-0 h-[2px]"
                  style={{ backgroundColor: isConnected ? '#22c55e' : ORANGE }}
                />

                <div className="p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Left: profile info */}
                  <div className="flex items-center gap-5">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    >
                      <FaGithub size={28} style={{ color: isConnected ? '#fff' : '#4b5563' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2
                          className="font-black text-white"
                          style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
                        >
                          {username}
                        </h2>
                        {isConnected ? (
                          <span
                            className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-lg"
                            style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                          >
                            <FaCheckCircle size={8} className="inline mr-1" />CONNECTED
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-lg"
                            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                          >
                            <FaExclamationCircle size={8} className="inline mr-1" />DISCONNECTED
                          </span>
                        )}
                      </div>
                      <p className="text-[13px]" style={{ color: '#6b7280' }}>
                        {isConnected
                          ? 'Your account is fully configured for automatic solution sync'
                          : 'Connect your GitHub account to enable automatic solution sync'}
                      </p>
                      {isConnected && profileUrl !== '#' && (
                        <button
                          onClick={() => window.open(profileUrl, '_blank', 'noopener,noreferrer')}
                          className="text-[11px] font-semibold mt-2 flex items-center gap-1.5 transition-colors"
                          style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; }}
                        >
                          <FaExternalLinkAlt size={9} /> {profileUrl}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <button
                    onClick={handleReconnect}
                    disabled={isConnectingGithub}
                    className="flex items-center gap-2.5 font-bold text-sm text-white rounded-xl px-6 py-3 transition-all duration-200 flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${ORANGE}, #ff9a1a)`,
                      border: 'none',
                      cursor: isConnectingGithub ? 'not-allowed' : 'pointer',
                      opacity: isConnectingGithub ? 0.6 : 1,
                      boxShadow: '0 4px 16px rgba(255,107,26,0.25)',
                    }}
                    onMouseEnter={e => {
                      if (!isConnectingGithub) {
                        e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,107,26,0.4)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,107,26,0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {isConnectingGithub ? <FaSpinner size={13} className="animate-spin" /> : <FaFire size={13} />}
                    {isConnectingGithub ? 'Connecting…' : isConnected ? 'Reconnect GitHub' : 'Connect GitHub'}
                  </button>
                </div>
              </motion.section>

              {/* ── REPOSITORIES + RECENT ACTIVITY (only when connected) ── */}
              {isConnected && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Managed Repositories */}
                  <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="font-black text-white"
                        style={{ fontSize: '16px', letterSpacing: '-0.02em' }}
                      >
                        Managed Repositories
                      </h3>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase"
                        style={{ backgroundColor: '#1a1a1a', color: '#6b7280' }}
                      >
                        {data?.availableRepositories?.length || 0} repos
                      </span>
                    </div>

                    {data?.availableRepositories?.length > 0 ? (
                      <div className="space-y-3">
                        {data.availableRepositories.map((r, i) => (
                          <RepoCard key={r} slug={r} profileUrl={profileUrl} delay={0.05 * i} />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center py-16 rounded-xl text-center"
                        style={{ backgroundColor: '#111111', border: '1px dashed #1e1e1e' }}
                      >
                        <FaBoxOpen size={28} style={{ color: '#2a2a2a', marginBottom: '12px' }} />
                        <p className="text-[13px] font-semibold text-white mb-1">No repositories yet</p>
                        <p className="text-[12px]" style={{ color: '#4b5563' }}>
                          Solve your first question to auto-create a repo.
                        </p>
                      </div>
                    )}

                    {/* Open profile CTA */}
                    {profileUrl !== '#' && (
                      <button
                        onClick={() => window.open(profileUrl, '_blank', 'noopener,noreferrer')}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                        style={{
                          backgroundColor: '#111111',
                          border: '1px solid #1e1e1e',
                          color: '#6b7280',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = ORANGE;
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#1e1e1e';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        <FaGithub size={14} /> Open GitHub Profile
                      </button>
                    )}
                  </motion.section>

                  {/* Recent Activity */}
                  <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="font-black text-white"
                        style={{ fontSize: '16px', letterSpacing: '-0.02em' }}
                      >
                        Recent Activity
                      </h3>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase"
                        style={{ backgroundColor: '#1a1a1a', color: '#6b7280' }}
                      >
                        {(data?.recentSubmissions || []).length} items
                      </span>
                    </div>

                    <div
                      className="rounded-2xl"
                      style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
                    >
                      {(data?.recentSubmissions || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                          <FaSync size={24} style={{ color: '#2a2a2a', marginBottom: '12px' }} />
                          <p className="text-[13px] font-semibold text-white mb-1">No synced submissions</p>
                          <p className="text-[12px]" style={{ color: '#4b5563' }}>
                            Your solved questions will appear here after sync.
                          </p>
                        </div>
                      ) : (
                        <div className="px-6 pt-2 pb-4">
                          {data.recentSubmissions.map((sub, i) => (
                            <ActivityItem key={sub._id} sub={sub} index={i} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.section>
                </div>
              )}
            </>
          )}
        </main>

        {/* ── Footer ── */}
        <footer
          className="px-10 py-5 flex items-center justify-between"
          style={{ borderTop: '1px solid #141414' }}
        >
          <span className="text-[12px]" style={{ color: '#2a2a2a' }}>
            © 2024 CodePrep — GitHub Sync
          </span>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[12px] font-semibold transition-colors"
            style={{ color: '#3d3d3d', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3d3d3d'; }}
          >
            ← Back to Dashboard
          </button>
        </footer>
      </div>
    </div>
  );
}
