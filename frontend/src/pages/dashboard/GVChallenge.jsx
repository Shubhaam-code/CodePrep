import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Flame, Share2, ExternalLink, X,
  Loader2, Trophy, Copy, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../store/store';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';

const SIDEBAR_W = 224;
const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'Other'];

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
  const { user } = useAppSelector((s) => s.auth);

  const [screen, setScreen] = useState('home'); // 'home' | 'preview' | 'success'
  const [showSolutionForm, setShowSolutionForm] = useState(false);
  const [solution, setSolution] = useState('');
  const [language, setLanguage] = useState('Python');
  const [generatedPost, setGeneratedPost] = useState('');
  const [originalPost, setOriginalPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMarkDone, setShowMarkDone] = useState(false);
  const [toast, setToast] = useState('');
  const [showLeetHubBanner, setShowLeetHubBanner] = useState(
    localStorage.getItem('leethubSetup') !== 'done'
  );
  const [copiedPost, setCopiedPost] = useState(false);

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
  const prog = progress || { totalCompleted: 0, currentStreak: 0, linkedinPosted: 0, completedDays: [] };

  const currentDay = prog.totalCompleted + 1;
  const currentQuestion = questions[currentDay - 1] || null;

  // Completed day numbers set
  const completedDayNums = new Set((prog.completedDays || []).map((c) => c.dayNumber));

  // ── Generate post ──────────────────────────────────────────────────────────
  const handleGeneratePost = async () => {
    if (!solution.trim() || !currentQuestion) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/api/gvchallenge/generate-post', {
        dayNumber: currentDay,
        questionTitle: currentQuestion.title,
        difficulty: currentQuestion.difficulty,
        topic: currentQuestion.topic,
        solution,
        language,
      });
      setGeneratedPost(res.data.post);
      setOriginalPost(res.data.post);
      setScreen('preview');
    } catch (err) {
      setToast('❌ Failed to generate post. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Regenerate ─────────────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!solution.trim() || !currentQuestion) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/api/gvchallenge/generate-post', {
        dayNumber: currentDay,
        questionTitle: currentQuestion.title,
        difficulty: currentQuestion.difficulty,
        topic: currentQuestion.topic,
        solution,
        language,
      });
      setGeneratedPost(res.data.post);
      setOriginalPost(res.data.post);
    } catch {
      setToast('❌ Regeneration failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copy ───────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPost);
    setCopiedPost(true);
    setToast('✅ Copied to clipboard!');
    setTimeout(() => setCopiedPost(false), 2000);
  };

  // ── Open LinkedIn ──────────────────────────────────────────────────────────
  const handleOpenLinkedIn = async () => {
    await navigator.clipboard.writeText(generatedPost);
    window.open('https://www.linkedin.com/feed/', '_blank');
    setToast('📋 Post copied! Paste on LinkedIn (Ctrl+V)');
    setShowMarkDone(true);
  };

  // ── Mark Complete ──────────────────────────────────────────────────────────
  const handleMarkComplete = async (posted = true) => {
    if (!currentQuestion) return;
    try {
      await apiClient.post('/api/gvchallenge/mark-complete', {
        dayNumber: currentDay,
        questionTitle: currentQuestion.title,
        questionUrl: currentQuestion.leetcodeUrl,
        solution,
        language,
        topic: currentQuestion.topic,
        difficulty: currentQuestion.difficulty,
        linkedinPosted: posted,
      });
      await refetchProgress();
      setScreen('success');
    } catch {
      setToast('❌ Failed to mark complete.');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREEN: preview
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'preview') {
    const charCount = generatedPost.length;
    const charOver = charCount > 1300;

    return (
      <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-10" style={{ marginLeft: SIDEBAR_W }}>
          <AnimatePresence>
            {toast && <Toast message={toast} onDone={() => setToast('')} />}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-2xl mx-auto px-6 py-10"
          >
            {/* Back */}
            <button
              onClick={() => setScreen('home')}
              className="cursor-pointer text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-2)' }}
            >
              ← Back
            </button>

            <h1 className="font-bold text-xl mb-5" style={{ color: 'var(--text-1)' }}>
              LinkedIn Post Preview
            </h1>

            {/* LinkedIn card */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: 'var(--orange)' }}
                >
                  {(user?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{user?.name || 'You'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>• 1st &nbsp;·&nbsp; Just now</p>
                </div>
              </div>

              {/* Editable content */}
              <div className="px-4 py-4">
                <textarea
                  value={generatedPost}
                  onChange={(e) => setGeneratedPost(e.target.value)}
                  rows={12}
                  className="w-full bg-transparent border-none outline-none resize-y text-sm leading-relaxed"
                  style={{ color: 'var(--text-1)', fontFamily: 'Inter, sans-serif' }}
                />
                <p className={`text-xs text-right mt-2 ${charOver ? 'text-red-400' : 'text-green-400'}`}>
                  {charCount}/1300
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : '🔄'} Regenerate
                </button>
                <button
                  onClick={() => setGeneratedPost(originalPost)}
                  className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                >
                  ↩ Reset
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="cursor-pointer w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              >
                {copiedPost ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                {copiedPost ? 'Copied!' : '📋 Copy Post'}
              </button>

              <button
                onClick={handleOpenLinkedIn}
                className="cursor-pointer w-full py-3 rounded-xl font-semibold text-sm text-black flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--orange), var(--secondary))' }}
              >
                🔗 Open LinkedIn & Post →
              </button>
            </div>

            {/* Mark Done section */}
            <AnimatePresence>
              {showMarkDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-xl p-5 text-center"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <p className="font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
                    Did you post on LinkedIn? 🎉
                  </p>
                  <button
                    onClick={() => handleMarkComplete(true)}
                    className="cursor-pointer w-full px-8 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >
                    ✅ Yes, I Posted!
                  </button>
                  <button
                    onClick={() => handleMarkComplete(false)}
                    className="cursor-pointer mt-2 text-xs underline transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-3)' }}
                  >
                    Skip (I'll post later)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREEN: success
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'success') {
    return (
      <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex items-center justify-center pb-10" style={{ marginLeft: SIDEBAR_W }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16 px-6 max-w-md"
          >
            <div className="text-8xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
              Day {currentDay - 1} Complete!
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>
              Keep the momentum going!
            </p>

            {/* Checklist */}
            <div className="inline-block text-left mb-6">
              {['LeetCode Solved', 'GitHub Pushed via LeetHub', 'LinkedIn Post Generated'].map((item) => (
                <div key={item} className="flex items-center gap-3 mb-3">
                  <CheckCircle size={20} className="text-green-400 shrink-0" />
                  <span className="text-sm" style={{ color: 'var(--text-1)' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Streak card */}
            <div
              className="mx-auto max-w-xs rounded-xl p-5 text-center mb-8"
              style={{
                background: 'var(--orange-dim)',
                border: '1px solid rgba(249,115,22,0.3)',
              }}
            >
              <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>
                🔥 {prog.currentStreak + 1} Day Streak!
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                Keep the momentum going!
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => { setScreen('home'); refetchProgress(); }}
                className="cursor-pointer px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              >
                View All Questions →
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="cursor-pointer px-6 py-2.5 rounded-xl text-sm font-semibold text-black transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--orange), var(--secondary))' }}
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

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
            Code. Push. Post. Repeat.
          </h1>
          <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--text-2)' }}>
            Solve daily DSA questions, push to GitHub with LeetHub, share on LinkedIn
          </p>
        </div>

        {/* LEETHUB BANNER */}
        <AnimatePresence>
          {showLeetHubBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-6 mb-4 rounded-xl px-5 py-4"
              style={{
                background: 'var(--orange-dim)',
                border: '1px solid rgba(249,115,22,0.3)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm" style={{ color: 'var(--orange)' }}>
                  ⚡ Quick Setup Required
                </span>
                <button
                  onClick={() => {
                    localStorage.setItem('leethubSetup', 'done');
                    setShowLeetHubBanner(false);
                  }}
                  className="cursor-pointer transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-3)' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-3 text-sm space-y-1" style={{ color: 'var(--text-2)' }}>
                <p>
                  <span className="font-semibold">1.</span>{' '}
                  <a
                    href="https://chrome.google.com/webstore/detail/leethub-v2/mhanfgfagplhgemhjfeolkkdidbakocm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--orange)' }}
                  >
                    Install LeetHub Extension →
                  </a>
                </p>
                <p><span className="font-semibold">2.</span> Connect LeetHub to your GitHub account</p>
                <p><span className="font-semibold">3.</span> Start solving — GitHub push is automatic!</p>
              </div>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-orange-500"
                  onChange={(e) => {
                    if (e.target.checked) {
                      localStorage.setItem('leethubSetup', 'done');
                      setShowLeetHubBanner(false);
                    }
                  }}
                />
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>I've set up LeetHub ✓</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-4 mx-6 mb-6">
          {[
            { label: 'Days Completed', value: prog.totalCompleted, icon: <CheckCircle size={18} className="text-green-400" /> },
            { label: 'Current Streak 🔥', value: prog.currentStreak, icon: <Flame size={18} style={{ color: 'var(--orange)' }} /> },
            { label: 'LinkedIn Posts', value: prog.linkedinPosted, icon: <Share2 size={18} className="text-blue-400" /> },
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
                  style={{ background: 'var(--orange-dim)', color: 'var(--orange)' }}
                >
                  📅 Today
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

              {/* Instructions */}
              <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--text-2)' }}>
                <p>1. Open question on LeetCode below</p>
                <p>2. Solve &amp; Submit → LeetHub auto-pushes to GitHub ✅</p>
                <p>3. Come back, paste solution, generate LinkedIn post</p>
              </div>

              {/* Open LeetCode button */}
              <button
                onClick={() => {
                  window.open(currentQuestion.leetcodeUrl, '_blank');
                  setShowSolutionForm(true);
                }}
                className="cursor-pointer w-full py-3 rounded-xl font-semibold text-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 mb-4"
                style={{ background: 'linear-gradient(135deg, var(--orange), var(--secondary))' }}
              >
                <ExternalLink size={15} /> Open on LeetCode →
              </button>

              {/* Solution form */}
              <AnimatePresence>
                {showSolutionForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl p-5 mt-2"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-2)' }}>
                      Paste your accepted solution:
                    </p>

                    {/* Language pills */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: language === lang ? 'var(--orange)' : 'var(--bg-card)',
                            color: language === lang ? '#fff' : 'var(--text-3)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      rows={8}
                      placeholder="# Paste your accepted solution here..."
                      className="w-full rounded-xl p-3 text-sm resize-y outline-none transition-all"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '13px',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--orange-dim)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                    />

                    {/* Generate button */}
                    <button
                      onClick={handleGeneratePost}
                      disabled={!solution.trim() || isGenerating}
                      className="cursor-pointer w-full mt-3 py-3 rounded-xl font-semibold text-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, var(--orange), var(--secondary))' }}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          🤖 AI is writing your post...
                        </>
                      ) : (
                        'Generate LinkedIn Post →'
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </span>

                      <span>
                        <button
                          onClick={() => {
                            window.open(q.leetcodeUrl, '_blank');
                            if (isToday) {
                              setShowSolutionForm(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className="cursor-pointer text-sm font-medium hover:underline transition-all"
                          style={{ color: 'var(--orange)' }}
                        >
                          Solve →
                        </button>
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
