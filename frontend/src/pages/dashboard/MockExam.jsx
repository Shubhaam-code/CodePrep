import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Play, ArrowRight, AlertTriangle, Timer, CheckCircle, 
  XCircle, Share2, RefreshCcw, BookOpen, ExternalLink, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { startExam, submitExam, getResult } from '../../api/exam';

import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const diffTimes = {
  Easy: '60 mins',
  Medium: '90 mins',
  Hard: '120 mins',
  Mixed: '90 mins'
};

const diffColors = {
  Easy: 'text-green-400 bg-green-400/10 border-green-500/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20',
  Hard: 'text-red-400 bg-red-400/10 border-red-500/20',
};

export default function MockExam() {
  const SIDEBAR_W = 224;
  const navigate = useNavigate();

  // Screen controls: 'setup' | 'active' | 'results'
  const [screen, setScreen] = useState('setup');
  
  // Setup inputs
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(10);

  // Active Exam state
  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: 'A'|'B'|'C'|'D' }
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showFsWarning, setShowFsWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results state
  const [resultId, setResultId] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Timer Ref
  const timerRef = useRef(null);

  // 1. Fetch available companies
  const { data: companies, isLoading: loadingCos } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Set default company when companies load
  useEffect(() => {
    if (companies && companies.length > 0 && !company) {
      setCompany(companies[0]);
    }
  }, [companies]);

  // 2. Tab Visibility Switch Monitor (Security)
  useEffect(() => {
    if (screen !== 'active') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            triggerAutoSubmit('tab_switches');
          } else {
            setShowWarningModal(true);
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [screen, examId, answers]);

  // 3. Fullscreen escape detector
  useEffect(() => {
    if (screen !== 'active') return;

    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setShowFsWarning(true);
      } else {
        setShowFsWarning(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [screen]);

  // 4. Timer interval
  useEffect(() => {
    if (screen !== 'active') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          triggerAutoSubmit('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [screen]);

  // Helper: Request Fullscreen
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen entry blocked:', e);
    }
  };

  // Helper: Exit Fullscreen
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // Actions
  const handleStartExam = async () => {
    if (!company) return;
    try {
      const data = await startExam(company, difficulty, count);
      setExamId(data.examId);
      setQuestions(data.questions);
      setTimeLeft(data.timeLimit * 60);
      setCurrentIdx(0);
      setAnswers({});
      setTabWarnings(0);
      setShowWarningModal(false);
      setShowFsWarning(false);
      setScreen('active');
      
      // Request lock
      await enterFullscreen();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initialize exam session.');
    }
  };

  const triggerAutoSubmit = async (reason = 'user') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    clearInterval(timerRef.current);
    exitFullscreen();

    try {
      // Format answers into array format expected by backend
      const formattedAnswers = Object.keys(answers).map(qId => ({
        questionId: qId,
        userAnswer: answers[qId]
      }));

      const submitRes = await submitExam(examId, formattedAnswers);
      const results = await getResult(examId);
      
      setResultsData(results);
      setResultId(examId);
      setScreen('results');
    } catch (err) {
      console.error('Error submitting exam:', err);
      alert('An error occurred during submission. Retrying results fetching...');
      // Try fetching anyway if session was auto-completed
      try {
        const results = await getResult(examId);
        setResultsData(results);
        setResultId(examId);
        setScreen('results');
      } catch (nested) {
        setScreen('setup');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (!resultsData) return;
    const text = `I just finished the ${resultsData.company} Mock Assessment on CodePrep AI!\nScore: ${resultsData.score}/${resultsData.totalQuestions} Correct (${Math.round((resultsData.score / resultsData.totalQuestions) * 100)}%)\nDifficulty: ${resultsData.difficulty}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentQ = questions[currentIdx];

  // Render Screens
  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {screen === 'setup' && <Sidebar />}

      <main 
        className="flex-1 overflow-y-auto" 
        style={screen === 'setup' ? { marginLeft: SIDEBAR_W } : { marginLeft: 0 }}
      >
        {/* SCREEN 1: SETUP */}
        {screen === 'setup' && (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-white font-bold text-lg flex items-center gap-2">
                  <ClipboardList size={18} className="text-[#FF7A00]" />
                  Mock Assessment
                </h1>
                <p className="text-gray-500 text-xs">Simulate top-tier company online assessment coding rounds</p>
              </div>
            </div>

            {/* Config Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] border border-white/8 rounded-3xl p-6 shadow-xl">
              {/* Form columns (2/3) */}
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-white font-bold text-sm border-b border-white/5 pb-2">Exam Configuration</h2>
                
                {/* Company Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Select Company</label>
                  {loadingCos ? (
                    <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
                  ) : (
                    <select
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#0D0D12] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white capitalize outline-none focus:border-[#FF7A00]"
                    >
                      {companies?.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Difficulty tabs */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold block">Select Difficulty</label>
                  <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl w-max">
                    {['Easy', 'Medium', 'Hard', 'Mixed'].map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                          difficulty === d 
                            ? 'bg-[#FF7A00] text-black font-extrabold shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question count */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold block">Number of Questions</label>
                  <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl w-max">
                    {[5, 10, 15, 20].map(num => (
                      <button
                        key={num}
                        onClick={() => setCount(num)}
                        className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                          count === num 
                            ? 'bg-white/10 text-white font-extrabold border border-white/20'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time card (1/3) */}
              <div className="bg-[#0D0D12]/50 border border-[#FF7A00]/20 rounded-2xl p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 flex items-center justify-center border border-[#FF7A00]/25">
                    <Timer size={18} className="text-[#FF7A00]" />
                  </div>
                  <h3 className="text-white font-bold text-sm mt-3">Allotted Duration</h3>
                  <p className="text-3xl font-extrabold text-white tracking-tight">
                    {diffTimes[difficulty]}
                  </p>
                  <p className="text-[10px] text-gray-500">Based on selected difficulty</p>
                </div>

                <button 
                  onClick={handleStartExam}
                  className="w-full mt-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 shadow shadow-[#FF7A00]/10 transition-all"
                >
                  <Play size={12} className="fill-black" />
                  Start Exam →
                </button>
              </div>
            </div>

            {/* Info warnings cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                <span className="text-red-400 font-bold text-xs uppercase tracking-wider block mb-1">⚠️ Fullscreen & Security</span>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Switching tabs or exiting fullscreen mode is monitored. Exceeding 3 tab closures auto-submits.
                </p>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
                <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider block mb-1">⏱️ Time Limit</span>
                <p className="text-gray-500 text-xs leading-relaxed">
                  The test runs on a hard timer. When time runs out, your session and current inputs submit automatically.
                </p>
              </div>
              <div className="bg-[#FF7A00]/5 border border-[#FF7A00]/20 rounded-2xl p-5">
                <span className="text-[#FFB800] font-bold text-xs uppercase tracking-wider block mb-1">📊 Assessment Summary</span>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Detailed analytics, correct answers, time spent, and target practice recommendations provided post-test.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: ACTIVE EXAM */}
        {screen === 'active' && questions.length > 0 && (
          <div className="min-h-screen bg-[#09090C] text-white flex flex-col">
            {/* Header top bar */}
            <header className="sticky top-0 z-40 bg-[#0B0B0F] border-b border-white/5 px-6 py-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF7A00] block">Timed Session</span>
                <h2 className="text-sm font-bold text-white capitalize">{company} Mock Assessment</h2>
              </div>

              {/* Centered Timer */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/8 px-4 py-1.5 rounded-full font-mono font-bold text-sm">
                <Timer size={14} className={timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-400'} />
                <span className={timeLeft < 300 ? 'text-red-500' : 'text-white'}>
                  {formatTimer(timeLeft)}
                </span>
              </div>

              {/* Progress Count */}
              <div className="text-xs font-semibold text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/8">
                Question {currentIdx + 1} of {questions.length}
              </div>
            </header>

            {/* Split Workspace */}
            <div className="flex-1 flex overflow-hidden">
              {/* Question Area (Left) */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Meta details */}
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border ${diffColors[currentQ.difficulty] || ''}`}>
                    {currentQ.difficulty}
                  </span>
                  
                  {currentQ.leetcodeUrl && (
                    <a 
                      href={currentQ.leetcodeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-gray-500 hover:text-[#FF7A00] flex items-center gap-1 transition-colors"
                    >
                      View on LeetCode <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {currentIdx + 1}. {currentQ.title}
                </h1>

                {/* Simulated Options */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Select the most optimal runtime approach:</p>
                  {currentQ.options?.map((opt) => {
                    const isSelected = answers[currentQ._id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQ._id]: opt.key }))}
                        className={`cursor-pointer w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                          isSelected 
                            ? 'bg-[#FF7A00]/10 border-[#FF7A00] text-white' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-gray-300'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                          isSelected ? 'bg-[#FF7A00] text-black' : 'bg-white/5 text-gray-400'
                        }`}>
                          {opt.key}
                        </span>
                        <span className="text-xs leading-relaxed">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Actions */}
                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  {currentIdx === questions.length - 1 ? (
                    <button
                      onClick={() => triggerAutoSubmit('user')}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-[#FF7A00] text-white font-extrabold text-xs rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {isSubmitting ? 'Submitting...' : 'Finish Assessment'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                      className="flex items-center gap-1 text-xs font-semibold text-[#FF7A00] hover:text-white"
                    >
                      Next Question <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Navigator Sidebar (Right) */}
              <div className="w-64 bg-[#0B0B0F] border-l border-white/5 p-5 hidden md:flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Navigator</h3>
                  
                  {/* Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {questions.map((q, idx) => {
                      const isAnswered = !!answers[q._id];
                      const isActive = idx === currentIdx;

                      return (
                        <button
                          key={q._id}
                          onClick={() => setCurrentIdx(idx)}
                          className={`cursor-pointer aspect-square rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                            isActive 
                              ? 'border-2 border-[#FF7A00] text-[#FFB800] bg-white/5' 
                              : isAnswered
                              ? 'bg-green-500/10 text-green-400 border border-green-500/25'
                              : 'bg-white/5 text-gray-500 border border-transparent'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed">
                  🔐 Timed security is active. Exiting tab triggers immediate automatic submission.
                </div>
              </div>
            </div>

            {/* Tab switch warning Modal */}
            <AnimatePresence>
              {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                  <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }}
                    className="bg-[#0D0D12] border border-red-500/30 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl relative">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={20} className="text-red-500 animate-pulse" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">Security Warning!</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-6">
                      You switched tabs. This is warning <span className="text-red-500 font-bold">{tabWarnings} of 2</span>. 
                      Exceeding 3 switches will auto-submit your exam!
                    </p>
                    <button 
                      onClick={() => setShowWarningModal(false)}
                      className="px-6 py-2 bg-gradient-to-r from-red-600 to-[#FF7A00] text-white font-bold text-xs rounded-xl"
                    >
                      Return to Exam
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Exit Fullscreen warning overlay */}
            <AnimatePresence>
              {showFsWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                  <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                    className="bg-[#0D0D12] border border-yellow-500/30 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={20} className="text-yellow-500" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">Exited Fullscreen!</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-6">
                      Please enter fullscreen mode again to continue the assessment.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button 
                        onClick={enterFullscreen}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl"
                      >
                        Enter Fullscreen
                      </button>
                      <button 
                        onClick={() => triggerAutoSubmit('user')}
                        className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs rounded-xl"
                      >
                        Submit Exam
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* SCREEN 3: RESULTS */}
        {screen === 'results' && resultsData && (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 py-4">
              <h1 className="text-white font-bold text-lg">Assessment Summary</h1>
              <p className="text-gray-500 text-xs">Review your exam score metrics and solution feedback</p>
            </div>

            {/* Performance summary card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] border border-white/8 rounded-3xl p-6 shadow-xl">
              {/* Left Score text (2/3) */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold tracking-widest text-[#FF7A00] bg-[#FF7A00]/10 px-2 py-0.5 rounded-lg border border-[#FF7A00]/25 uppercase">
                    {resultsData.company} Mock Result
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {resultsData.score} / {resultsData.totalQuestions} Correct
                </h2>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
                  <p>🕒 Time taken: <span className="text-white font-medium">{Math.floor(resultsData.timeTaken / 60)}m {resultsData.timeTaken % 60}s</span></p>
                  <p>🔥 Difficulty: <span className="text-white font-medium">{resultsData.difficulty}</span></p>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <button 
                    onClick={() => setScreen('setup')}
                    className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <RefreshCcw size={12} /> Retake Exam
                  </button>
                  
                  <Link 
                    to={`/company/${resultsData.company.toLowerCase()}`}
                    className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <BookOpen size={12} className="text-[#FF7A00]" /> Practice Weak Questions
                  </Link>

                  <button 
                    onClick={handleShare}
                    className="cursor-pointer px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Share2 size={12} /> {copySuccess ? 'Copied!' : 'Share Result'}
                  </button>
                </div>
              </div>

              {/* SVG Ring Chart (1/3) */}
              <div className="flex flex-col items-center justify-center p-3 border-l border-white/5">
                {(() => {
                  const pct = Math.round((resultsData.score / resultsData.totalQuestions) * 100);
                  const radius = 40;
                  const circ = 2 * Math.PI * radius;
                  const offset = circ - (pct / 100) * circ;
                  return (
                    <div className="relative flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                        <circle 
                          cx="48" 
                          cy="48" 
                          r={radius} 
                          stroke="#FF7A00" 
                          strokeWidth="6" 
                          fill="transparent" 
                          strokeDasharray={circ} 
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-lg font-black text-white">{pct}%</span>
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Score</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Grid for breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Questions table (2/3) */}
              <div className="md:col-span-2 bg-[#0D0D12]/50 border border-white/8 rounded-3xl p-5 overflow-hidden">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Question Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-gray-500 font-bold border-b border-white/5 pb-2">
                        <th className="pb-2.5">Title</th>
                        <th className="pb-2.5 text-center">Your Ans</th>
                        <th className="pb-2.5 text-center">Status</th>
                        <th className="pb-2.5 text-right">LeetCode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {resultsData.questions?.map((q, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-semibold text-gray-300 max-w-[200px] truncate">{q.title}</td>
                          <td className="py-3 text-center font-mono font-bold text-[#FFB800]">{q.userAnswer || '-'}</td>
                          <td className="py-3 text-center">
                            {q.isCorrect ? (
                              <CheckCircle size={14} className="text-green-500 mx-auto" />
                            ) : (
                              <XCircle size={14} className="text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {q.leetcodeUrl ? (
                              <a href={q.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white inline-block">
                                &#8599;
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Difficulty breakdown (1/3) */}
              <div className="bg-[#0D0D12]/50 border border-white/8 rounded-3xl p-5 space-y-4">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Difficulty Breakdown</h3>
                {Object.keys(resultsData.breakdown || {}).map((diff) => {
                  const dObj = resultsData.breakdown[diff];
                  const dPct = dObj.total > 0 ? Math.round((dObj.solved / dObj.total) * 100) : 0;
                  return (
                    <div key={diff} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-semibold">{diff}</span>
                        <span className="text-white font-mono">{dObj.solved} / {dObj.total}</span>
                      </div>
                      <div className="w-full bg-[#0B0B0F] h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-[#FF7A00] h-full rounded-full" style={{ width: `${dPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
