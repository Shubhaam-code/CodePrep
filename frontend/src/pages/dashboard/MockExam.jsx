import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Play, ArrowRight, AlertTriangle, CheckCircle, 
  XCircle, RefreshCcw, BookOpen, ExternalLink, ChevronLeft, 
  ChevronRight, Laptop, HelpCircle, ShieldAlert, Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import QuestionContent from '../../components/exam/QuestionContent';
import CodeEditor from '../../components/exam/CodeEditor';
import ExamTimer from '../../components/exam/ExamTimer';

const STARTER_CODES = {
  javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
var solution = function() {
  // Write your solution here
};`,
  python: `class Solution:
  def solution(self):
    # Write your solution here
    pass`,
  java: `class Solution {
    public int solution() {
        // Write your solution here
        return 0;
    }
}`,
  cpp: `class Solution {
public:
    int solution() {
        // Write your solution here
        return 0;
    }
};`
};

export default function MockExam() {
  const SIDEBAR_W = 224;
  const navigate = useNavigate();

  // Screen state: 'setup' | 'active' | 'results'
  const [screen, setScreen] = useState('setup');

  // Setup options
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);

  // Active Exam state
  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [codes, setCodes] = useState({}); // { [idx]: code }
  const [languages, setLanguages] = useState({}); // { [idx]: lang }
  const [warnings, setWarnings] = useState(0);
  const [toast, setToast] = useState('');
  const [showFsModal, setShowFsModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // placeholder in seconds

  // Results state
  const [resultsData, setResultsData] = useState(null);

  // Floating toast notifier helper
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast('');
    }, 4000);
  };

  // Fetch available companies
  const { data: companies, isLoading: loadingCos } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Set default company when list loads
  useEffect(() => {
    if (companies && companies.length > 0 && !company) {
      setCompany(companies[0]);
    }
  }, [companies]);

  // Request Fullscreen helper
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request blocked:', e);
    }
  };

  // Exit Fullscreen helper
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // Security Visibility tab monitoring
  useEffect(() => {
    if (screen !== 'active') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            triggerAutoSubmit(true);
          } else {
            showToast(`Warning ${next}/3: Don't switch tabs!`);
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [screen, examId, codes, languages]);

  // Fullscreen exit tracking
  useEffect(() => {
    if (screen !== 'active') return;

    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        // Only trigger warning if we are still active in the exam
        setWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            triggerAutoSubmit(true);
          } else {
            showToast(`Warning ${next}/3: Exiting fullscreen is restricted!`);
            setShowFsModal(true);
          }
          return next;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [screen, examId, codes, languages]);

  // Autosave and persistence recovery
  useEffect(() => {
    if (!examId || screen !== 'active') return;

    const localKey = `mock_exam_${examId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try {
        const { savedIdx, savedLangs } = JSON.parse(saved);
        if (savedIdx !== undefined) setCurrentIdx(savedIdx);
        if (savedLangs !== undefined) setLanguages(savedLangs);
      } catch (err) {
        console.error('Error recovering autosaved exam data:', err);
      }
    }
  }, [examId]);

  // Save current question index and language mapping on change
  useEffect(() => {
    if (!examId || screen !== 'active') return;

    localStorage.setItem(`mock_exam_${examId}`, JSON.stringify({
      savedIdx: currentIdx,
      savedLangs: languages
    }));
  }, [examId, currentIdx, languages, screen]);

  // Actions
  const handleStartExam = async () => {
    if (!company) return;
    try {
      const res = await apiClient.post('/api/exam/start', {
        company,
        difficulty,
        count
      });

      const { examId: id, questions: qs, timeLimit } = res.data;
      setExamId(id);
      setQuestions(qs);
      setTimeLeft(timeLimit * 60);
      setCurrentIdx(0);
      setWarnings(0);
      setShowFsModal(false);
      setShowSubmitModal(false);
      setShowHint(false);
      
      // Initialize states
      const initialCodes = {};
      const initialLangs = {};
      qs.forEach((_, index) => {
        initialLangs[index] = 'javascript';
        initialCodes[index] = STARTER_CODES.javascript;
      });
      setCodes(initialCodes);
      setLanguages(initialLangs);

      setScreen('active');
      await enterFullscreen();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start exam session.');
    }
  };

  const triggerAutoSubmit = async (forced = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    exitFullscreen();

    // Prepare format for submission
    const submissionAnswers = questions.map((q, index) => {
      const code = codes[index] || '';
      const lang = languages[index] || 'javascript';
      const isAttempted = code.trim() !== '' && code !== STARTER_CODES[lang];
      return {
        questionId: q._id,
        userCode: code,
        language: lang,
        attempted: isAttempted
      };
    });

    try {
      await apiClient.post(`/api/exam/submit/${examId}`, { answers: submissionAnswers });
      const res = await apiClient.get(`/api/exam/result/${examId}`);
      setResultsData(res.data);
      setScreen('results');
    } catch (err) {
      console.error('Error submitting exam answers:', err);
      // Fallback: try fetching results again
      try {
        const res = await apiClient.get(`/api/exam/result/${examId}`);
        setResultsData(res.data);
        setScreen('results');
      } catch (nested) {
        alert('Submission failed. Returning to setup.');
        setScreen('setup');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];
  const currentLang = languages[currentIdx] || 'javascript';
  const currentDefaultCode = STARTER_CODES[currentLang];

  const handleCodeChange = (newCode) => {
    setCodes(prev => ({
      ...prev,
      [currentIdx]: newCode
    }));
  };

  const handleLanguageChange = (newLang) => {
    setLanguages(prev => ({
      ...prev,
      [currentIdx]: newLang
    }));
    setCodes(prev => ({
      ...prev,
      [currentIdx]: STARTER_CODES[newLang]
    }));
  };

  const handleResetCode = () => {
    setCodes(prev => ({
      ...prev,
      [currentIdx]: STARTER_CODES[currentLang]
    }));
    // Remove individual localStorage key to force Monaco redraw
    localStorage.removeItem(`exam_code_${examId}_${currentIdx}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-slate-200">
      {screen === 'setup' && <Sidebar />}

      {/* Warning Toast Alerts */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} 
            animate={{ opacity: 1, y: 20 }} 
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 transform -translate-x-1/2 z-55 bg-rose-950 border border-rose-500/30 text-rose-400 font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs tracking-wider"
          >
            <ShieldAlert size={16} className="text-rose-500 animate-pulse" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main 
        className="flex-1 overflow-y-auto flex flex-col"
        style={screen === 'setup' ? { marginLeft: SIDEBAR_W } : { marginLeft: 0 }}
      >
        {/* SCREEN 1: SETUP */}
        {screen === 'setup' && (
          <div className="max-w-4xl mx-auto p-6 space-y-6 w-full py-12">
            <div>
              <h1 className="text-white font-extrabold text-2xl flex items-center gap-2">
                <ClipboardList size={22} className="text-[#FF7A00]" />
                Mock Assessment Round
              </h1>
              <p className="text-gray-500 text-xs mt-1">Practice realistic coding rounds with actual LeetCode questions and Monaco editor workflow.</p>
            </div>

            {/* Config panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.01] border border-white/5 rounded-3xl p-6 shadow-2xl">
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-white font-black text-sm uppercase tracking-wider border-b border-white/5 pb-2">Exam Parameters</h2>
                
                {/* Company Select */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Target Company</label>
                  {loadingCos ? (
                    <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
                  ) : (
                    <select
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#0D0D12] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white capitalize outline-none focus:border-[#FF7A00] transition"
                    >
                      {companies?.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold block">Difficulty Level</label>
                  <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl w-max">
                    {['Easy', 'Medium', 'Hard', 'Mixed'].map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`cursor-pointer px-4.5 py-2 text-xs font-bold rounded-lg transition-all ${
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
                  <label className="text-xs text-gray-400 font-semibold block">Question Pool Count</label>
                  <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl w-max">
                    {[2, 5, 10].map(num => (
                      <button
                        key={num}
                        onClick={() => setCount(num)}
                        className={`cursor-pointer px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                          count === num 
                            ? 'bg-white/10 text-white font-extrabold border border-white/15'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {num} Questions
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time card info */}
              <div className="bg-[#0D0D12]/60 border border-[#FF7A00]/25 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 flex items-center justify-center border border-[#FF7A00]/20">
                    <Laptop size={18} className="text-[#FF7A00]" />
                  </div>
                  <h3 className="text-white font-bold text-sm mt-3">Duration Allotment</h3>
                  <p className="text-3xl font-extrabold text-white tracking-tight">
                    {difficulty === 'Easy' ? '60 mins' : difficulty === 'Medium' ? '90 mins' : difficulty === 'Hard' ? '120 mins' : '90 mins'}
                  </p>
                  <p className="text-[10px] text-gray-500">Auto-allocated based on difficulty choice</p>
                </div>

                <button 
                  onClick={handleStartExam}
                  className="w-full mt-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow shadow-[#FF7A00]/10"
                >
                  <Play size={12} className="fill-black" />
                  Start Exam →
                </button>
              </div>
            </div>

            {/* Info warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5">
                <span className="text-red-400 font-bold text-xs uppercase tracking-wider block mb-1">🔒 Fullscreen Security & Monitoring</span>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Visits/switches outside the browser window, tab navigation, or escaping fullscreen is locked and logged. Warnings appear on infraction; 3 infractions auto-submits.
                </p>
              </div>
              <div className="bg-[#FF7A00]/5 border border-[#FF7A00]/10 rounded-2xl p-5">
                <span className="text-[#FFB800] font-bold text-xs uppercase tracking-wider block mb-1">⏳ Time Limit Enforcement</span>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Mock examinations must be submitted inside the time limit. Upon timeout, inputs save and submit automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: ACTIVE EXAM */}
        {screen === 'active' && questions.length > 0 && (
          <div className="h-screen w-screen flex flex-col bg-[#09090C] overflow-hidden relative select-none">
            {/* Top Bar Header */}
            <header className="h-14 bg-[#0B0B0F] border-b border-white/5 px-6 flex items-center justify-between shrink-0 z-40 select-none">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#FF7A00] block leading-none mb-0.5">Mock Test</span>
                <h2 className="text-xs font-extrabold text-white capitalize leading-none">{company} Code OA</h2>
              </div>

              {/* Exam timer component */}
              <ExamTimer 
                timeLimit={timeLeft} 
                onExpire={() => triggerAutoSubmit(true)} 
              />

              {/* Progress and status */}
              <div className="flex items-center gap-3">
                {warnings > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg animate-pulse">
                    ⚠️ Warning {warnings}/3
                  </span>
                )}
                <div className="text-xs font-semibold text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/8">
                  Q {currentIdx + 1} of {questions.length}
                </div>
              </div>
            </header>

            {/* Split layout */}
            <div className="flex-1 flex min-h-0 overflow-hidden flex-col md:flex-row">
              {/* LEFT SIDE: Question Description */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 border-b md:border-b-0 md:border-r border-white/5 bg-[#09090C] flex flex-col">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 shrink-0">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                    currentQ.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-500/20' :
                    currentQ.difficulty === 'Medium' ? 'text-amber-400 bg-amber-400/5 border-amber-500/20' :
                    'text-rose-400 bg-rose-400/5 border-rose-500/20'
                  }`}>
                    {currentQ.difficulty}
                  </span>

                  {currentQ.leetcodeUrl && (
                    <a 
                      href={currentQ.leetcodeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[11px] font-semibold text-slate-500 hover:text-[#FF7A00] flex items-center gap-1 transition-colors select-all"
                    >
                      Original LeetCode <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Problem details */}
                <div className="flex-1 min-h-0 space-y-4">
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
                    {currentIdx + 1}. {currentQ.title}
                  </h1>

                  {/* HTML Content Fetcher */}
                  <QuestionContent 
                    leetcodeId={currentQ.leetcodeId} 
                    title={currentQ.title} 
                  />
                </div>

                {/* Optional Hint toggler */}
                <div className="pt-6 border-t border-white/5 shrink-0 space-y-3">
                  <button
                    onClick={() => setShowHint(prev => !prev)}
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <HelpCircle size={13} />
                    {showHint ? 'Hide Hints' : 'Reveal Hints'}
                  </button>
                  <AnimatePresence>
                    {showHint && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-indigo-950/10 border border-indigo-500/10 p-3 rounded-xl text-xs text-indigo-300/80 leading-relaxed font-medium"
                      >
                        Utilize standard algorithm optimizations. Think about time complexity parameters relative to input limits.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: Monaco Editor */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#0B0B0F]">
                {/* Header configuration */}
                <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between shrink-0 select-none bg-[#09090C]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500">Language:</span>
                    <select
                      value={currentLang}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-[#0E0E12] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none cursor-pointer focus:border-[#FF7A00]"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>

                  <button
                    onClick={handleResetCode}
                    className="cursor-pointer text-[10px] font-bold px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                  >
                    Reset Code
                  </button>
                </div>

                {/* Monaco instance */}
                <div className="flex-1 min-h-0">
                  <CodeEditor 
                    key={`${examId}_${currentIdx}`} // redraw Monaco on question changes
                    language={currentLang}
                    defaultCode={currentDefaultCode}
                    examId={examId}
                    questionIndex={currentIdx}
                    onChange={handleCodeChange}
                  />
                </div>

                {/* Workspace bottom action bar */}
                <div className="h-16 border-t border-white/5 px-6 flex items-center justify-between shrink-0 bg-[#09090C] select-none">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    className="cursor-pointer text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  {currentIdx === questions.length - 1 ? (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="cursor-pointer px-6 py-2.5 bg-gradient-to-r from-rose-600 to-[#FF7A00] text-white font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                    >
                      Submit Exam
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                      className="cursor-pointer px-6 py-2.5 bg-[#FF7A00] hover:bg-[#FF8C1A] text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                    >
                      Save & Next <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Exit Fullscreen Modal Alert */}
            <AnimatePresence>
              {showFsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0D0D12] border border-yellow-500/30 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl"
                  >
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4 text-yellow-500">
                      <AlertTriangle size={20} />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">Exited Fullscreen Mode!</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-6">
                      Assessments must be completed in fullscreen. Exiting is recorded as a warning infraction.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => {
                          enterFullscreen();
                          setShowFsModal(false);
                        }}
                        className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl"
                      >
                        Stay in Exam (Lock FS)
                      </button>
                      <button 
                        onClick={() => {
                          setShowFsModal(false);
                          triggerAutoSubmit();
                        }}
                        className="cursor-pointer px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs rounded-xl"
                      >
                        Exit and Submit
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Submit Confirmation Modal */}
            <AnimatePresence>
              {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0D0D12] border border-white/5 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl relative"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4 text-[#FF7A00]">
                      <HelpCircle size={20} />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">Complete Mock Session?</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-6">
                      Are you sure you want to finalize and submit your assessment code files for evaluation?
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => setShowSubmitModal(false)}
                        className="cursor-pointer px-5 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs rounded-xl"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setShowSubmitModal(false);
                          triggerAutoSubmit();
                        }}
                        className="cursor-pointer px-6 py-2 bg-gradient-to-r from-rose-600 to-[#FF7A00] text-white font-bold text-xs rounded-xl"
                      >
                        Yes, Submit
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
          <div className="max-w-4xl mx-auto p-6 space-y-6 w-full py-12">
            <div className="border-b border-white/5 pb-4">
              <h1 className="text-white font-extrabold text-2xl flex items-center gap-2">
                <Award size={24} className="text-[#FF7A00]" />
                Assessment Results
              </h1>
              <p className="text-gray-500 text-xs">Review your attempted statistics and practice alternatives below</p>
            </div>

            {/* Results score panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.01] border border-white/5 rounded-3xl p-6 shadow-2xl">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest text-[#FF7A00] bg-[#FF7A00]/10 px-2.5 py-0.5 rounded-lg border border-[#FF7A00]/20 uppercase">
                    {resultsData.company} Mock Report
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {resultsData.score} / {resultsData.totalQuestions} Attempted
                </h2>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
                  <p>🕒 Time taken: <span className="text-white font-medium">{Math.floor(resultsData.timeTaken / 60)}m {resultsData.timeTaken % 60}s</span></p>
                  <p>🔥 Difficulty: <span className="text-white font-medium">{resultsData.difficulty}</span></p>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <button 
                    onClick={() => setScreen('setup')}
                    className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <RefreshCcw size={12} /> Retake Assessment
                  </button>
                  
                  <button 
                    onClick={() => navigate('/dashboard/roadmap')}
                    className="cursor-pointer px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <BookOpen size={12} className="text-[#FF7A00]" /> Back to Dashboard
                  </button>
                </div>
              </div>

              {/* Progress circle */}
              <div className="flex flex-col items-center justify-center p-3 border-t md:border-t-0 md:border-l border-white/5">
                {(() => {
                  const pct = Math.round((resultsData.score / resultsData.totalQuestions) * 100) || 0;
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
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Completion</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Questions list breakdown */}
            <div className="bg-[#0D0D12]/40 border border-white/5 rounded-3xl p-5 overflow-hidden">
              <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Question Breakdown</h3>
              <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">
                📢 Note: Solutions submitted on LeetCode for proper evaluation. Review your exam session records below:
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-500 font-bold border-b border-white/5 pb-2">
                      <th className="pb-2.5">Title</th>
                      <th className="pb-2.5 text-center">Difficulty</th>
                      <th className="pb-2.5 text-center">Language Used</th>
                      <th className="pb-2.5 text-center">Status</th>
                      <th className="pb-2.5 text-right">LeetCode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {resultsData.questions?.map((q, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="py-4 font-semibold text-gray-300 max-w-[200px] truncate">{q.title}</td>
                        <td className="py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                            q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono font-medium text-slate-400 capitalize">{q.language || '-'}</td>
                        <td className="py-4 text-center">
                          {q.attempted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle size={12} /> ✅ Attempted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-[11px]">
                              <XCircle size={12} /> ⏭ Skipped
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {q.leetcodeUrl ? (
                            <a 
                              href={q.leetcodeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-gray-500 hover:text-white inline-flex items-center gap-1 font-semibold transition-colors"
                            >
                              View on LeetCode →
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
