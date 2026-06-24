import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import {
  FaGithub,
  FaUser,
  FaCodeBranch,
  FaCode,
  FaTrophy,
  FaClock,
  FaArrowRight,
  FaExternalLinkAlt,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaFire
} from 'react-icons/fa';

const SIDEBAR_W = 224;

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

export default function GitHubProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  // Fetch GitHub stats from backend
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['githubProfileStats'],
    queryFn: async () => {
      const res = await apiClient.get('/api/github/stats');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Listen for mock OAuth success messages from the popup window
  useEffect(() => {
    const handleOAuthMessage = async (event) => {
      if (event.data?.type === 'oauth-success' && event.data?.provider === 'github') {
        try {
          const profileRes = await apiClient.get('/api/auth/me');
          dispatch(setUser(profileRes.data));
          refetch();
        } catch (err) {
          console.error('[GitHub Profile] Failed to sync profile details:', err);
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [dispatch, refetch]);

  const handleReconnect = () => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');
    const connectUrl = `${baseUrl}/api/auth/github?token=${token}`;
    window.open(connectUrl, 'GitHub Connect', 'width=600,height=600');
  };

  // Base configurations
  const username = user?.githubUsername || 'Not connected';
  const profileUrl = user?.githubProfileUrl || '#';
  const repoName = data?.repositoryName || 'company-preparation';
  const repoUrl = user?.githubUsername 
    ? `https://github.com/${user.githubUsername}/${repoName}`
    : '#';

  const isConnected = data?.githubConnected || false;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-12" style={{ marginLeft: SIDEBAR_W }}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaGithub size={18} className="text-[#FF7A00]" />
            <h1 className="text-white font-bold text-lg">GitHub Integration</h1>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition"
          >
            Back to Dashboard <FaArrowRight size={10} />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <FaSpinner size={24} className="text-[#FF7A00] animate-spin" />
              <p className="text-xs text-gray-500">Loading GitHub details...</p>
            </div>
          ) : isError ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-6 text-center text-sm font-medium">
              Failed to load integration statistics: {error.message || 'Error occurred.'}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile connection header card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0D0D12]/80 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB800]/2.5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-gray-300">
                      <FaUser size={24} />
                    </div>
                    <div>
                      <h2 className="text-white font-extrabold text-lg leading-tight flex items-center gap-2.5">
                        {username}
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            <FaCheckCircle size={8} /> Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            <FaExclamationCircle size={8} /> Disconnected
                          </span>
                        )}
                      </h2>
                      <p className="text-gray-500 text-xs mt-1">
                        {isConnected ? 'Fully configured for automatic question sync' : 'GitHub connection is not active'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleReconnect}
                      className="cursor-pointer px-4 py-2 text-xs font-extrabold text-black bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 rounded-xl transition shadow-md shadow-[#FF7A00]/10 flex items-center gap-2"
                    >
                      <FaFire size={12} /> {isConnected ? 'Reconnect GitHub' : 'Connect GitHub'}
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Detail cards */}
              {isConnected && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sync Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#0D0D12] border border-white/5 p-5 rounded-2xl shadow-lg space-y-4"
                  >
                    <h3 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-2.5">
                      <FaCodeBranch size={14} className="text-[#FFB800]" /> Repository Configuration
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Repository Name</span>
                        <p className="text-sm font-mono text-white mt-0.5">{repoName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">GitHub Profile URL</span>
                        <a
                          href={profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1.5 mt-0.5"
                        >
                          {profileUrl} <FaExternalLinkAlt size={10} className="text-gray-500" />
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Repository Link</span>
                        <a
                          href={repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1.5 mt-0.5"
                        >
                          {repoUrl} <FaExternalLinkAlt size={10} className="text-gray-500" />
                        </a>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex gap-3">
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 text-center text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        Open GitHub Profile
                      </a>
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 text-center text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        Open Repository
                      </a>
                    </div>
                  </motion.div>

                  {/* Sync Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-[#0D0D12] border border-white/5 p-5 rounded-2xl shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-2.5">
                        <FaCode size={14} className="text-[#FF7A00]" /> Sync Performance
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Synced</span>
                          <strong className="text-2xl text-white font-mono block mt-1">{data?.totalSolvedQuestions || 0}</strong>
                          <span className="text-[9px] text-gray-500">questions</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-bold text-gray-500 block">Companies</span>
                          <strong className="text-2xl text-[#FF7A00] font-mono block mt-1">{data?.totalCompaniesCovered || 0}</strong>
                          <span className="text-[9px] text-gray-500">covered</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <FaClock size={11} /> Last Synced Action:
                      </span>
                      <strong className="text-gray-300">
                        {data?.lastSyncAt ? timeAgo(data.lastSyncAt) : 'Not synced yet'}
                      </strong>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Recent Activity List */}
              {isConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#0D0D12] border border-white/5 p-5 rounded-2xl shadow-lg space-y-4"
                >
                  <h3 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-2.5">
                    <FaTrophy size={14} className="text-[#FF7A00]" /> Recent Activity
                  </h3>

                  {(data?.recentSubmissions || []).length === 0 ? (
                    <p className="text-xs text-center py-8 text-gray-500">No synced submissions available yet.</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {data.recentSubmissions.map((sub) => (
                        <div key={sub._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <div>
                            <h4 className="text-sm font-semibold text-white">{sub.questionTitle}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {sub.company} • <span className="uppercase text-[10px] bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">{sub.language}</span>
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{timeAgo(sub.submittedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
