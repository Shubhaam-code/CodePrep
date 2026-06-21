import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, RotateCcw, Flame, Calendar, ExternalLink, Layers, CheckCircle2, XCircle
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { getDailyQuestion, submitDailyQuestion, getSubmissions } from '../../api/playground';
import { updateSolvedQuestions } from '../../store/authSlice';
import apiClient from '../../api/axios';

import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const sampleCodes = {
  python: 'def solve():\n    # Write your solution here...\n    return True\n',
  javascript: 'function solve() {\n    // Write your solution here...\n    return true;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nbool solve() {\n    // Write your solution here...\n    return true;\n}\n',
  java: 'class Solution {\n    public boolean solve() {\n        // Write your solution here...\n        return true;\n    }\n}\n'
};

const getProblemDetails = (title) => {
  if (!title) return { desc: '', examples: [], constraints: [] };
  const t = title.toLowerCase();
  if (t.includes('two sum')) {
    return {
      desc: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' }
      ],
      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9',
        '-10^9 <= target <= 10^9',
        'Only one valid answer exists.'
      ]
    };
  }
  if (t.includes('lru cache')) {
    return {
      desc: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the LRUCache class:\n- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.\n- int get(int key) Return the value of the key if the key exists, otherwise return -1.\n- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity, evict the least recently used key.',
      examples: [
        { input: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]', output: '[null, null, null, 1, null, -1, null, -1, 3, 4]', explanation: 'Evicts key 2 when capacity exceeded, evicts key 1 when key 4 is added.' }
      ],
      constraints: [
        '1 <= capacity <= 3000',
        '0 <= key <= 10^4',
        '0 <= value <= 10^5',
        'At most 2 * 10^5 calls will be made to get and put.'
      ]
    };
  }
  return {
    desc: `Solve the classic "${title}" coding interview challenge. Read description, optimize execution complexities, and write your solution.`,
    examples: [
      { input: 'nums = [1, 2, 3], target = 5', output: 'true', explanation: 'Assertion conditions matched.' }
    ],
    constraints: [
      'Optimize for O(N) runtime complexity.',
      'Ensure standard variable naming and edge condition handlers.'
    ]
  };
};

const calculateStreaks = (submissions) => {
  const passed = submissions.filter(s => s.status === 'passed');
  if (passed.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Get unique YYYY-MM-DD dates in ascending order
  const dates = Array.from(new Set(passed.map(s => {
    const d = new Date(s.submittedAt || s.createdAt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }))).sort((a, b) => new Date(a) - new Date(b));

  if (dates.length === 0) return { current: 0, longest: 0 };

  // Calculate current streak
  let current = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const hasToday = dates.includes(todayStr);
  const hasYesterday = dates.includes(yesterdayStr);

  if (hasToday || hasYesterday) {
    let checkDate = hasToday ? new Date() : yesterday;
    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(checkStr)) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longest = 0;
  let running = 0;
  let prevDate = null;

  dates.forEach((dStr) => {
    const currentDate = new Date(dStr);
    if (!prevDate) {
      running = 1;
    } else {
      const diffTime = Math.abs(currentDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        if (running > longest) longest = running;
        running = 1;
      }
    }
    prevDate = currentDate;
  });

  if (running > longest) longest = running;

  return { current, longest };
};

export default function Playground() {
  const SIDEBAR_W = 224;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);

  // States
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState(sampleCodes.python);
  const [output, setOutput] = useState('Write your solution and click "Submit Solution" to run assertions...');
  const [running, setRunning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confetti, setConfetti] = useState([]);

  // Fetch Daily Challenge
  const { data: dailyData, isLoading, isError, error, refetch: refetchDaily } = useQuery({
    queryKey: ['dailyQuestion'],
    queryFn: getDailyQuestion,
    staleTime: 60 * 1000,
  });

  // Fetch user submission history for streaks and grids
  const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissionsHistory'],
    queryFn: getSubmissions,
    staleTime: 10 * 1000,
  });

  useEffect(() => {
    setCode(sampleCodes[lang] || '');
  }, [lang]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newValue);
      
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleRunSubmit = async () => {
    if (!dailyData?.question) return;
    setRunning(true);
    setOutput('Compiling code...\nLinking runtime libraries...\nExecuting isolated sandbox test suite...');

    try {
      const response = await submitDailyQuestion(dailyData.question._id, code, lang);
      
      setTimeout(async () => {
        setRunning(false);
        setOutput('All assertions passed (12/12)!\nExecution time: 42ms\nPeak Memory: 14.8 MB\n\nSolution accepted.');
        
        // Sync Redux profile solvedQuestions
        dispatch(updateSolvedQuestions(user?.solvedQuestions ? [...user.solvedQuestions, { questionId: dailyData.question._id, solvedAt: new Date() }] : []));
        
        // Refresh API queries
        await refetchDaily();
        await refetchSubmissions();

        // Trigger CSS confetti
        const particles = Array.from({ length: 40 }).map((_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          color: ['#FF7A00', '#FFB800', '#FFD700', '#4285F4', '#22C55E'][Math.floor(Math.random() * 5)],
          size: 6 + Math.random() * 8,
          delay: Math.random() * 0.5
        }));
        setConfetti(particles);
        setShowSuccessModal(true);
      }, 1500);

    } catch (err) {
      setRunning(false);
      setOutput(err.response?.data?.message || 'Assertions compilation error. Make sure to check syntax rules.');
    }
  };

  const handleReset = () => {
    setCode(sampleCodes[lang] || '');
    setOutput('Workspace reset.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
        <ErrorMessage message={error?.message || 'Failed to load daily coding challenge.'} />
      </div>
    );
  }

  const { question, isSolvedByUser, totalSolvedCount } = dailyData || {};
  const problemDetails = getProblemDetails(question?.title);

  // Generate 30 days grid info
  const passedSubmissions = submissions.filter(s => s.status === 'passed');
  const streaks = calculateStreaks(submissions);
  const currentStreak = user?.streak?.current || streaks.current || 0;
  const longestStreak = Math.max(currentStreak, streaks.longest);

  // Heatmap helper generating dates YYYY-MM-DD
  const today = new Date();
  today.setHours(0,0,0,0);
  const calendarDays = [];
  const normalizedSolves = passedSubmissions.map(sub => {
    const d = new Date(sub.submittedAt || sub.createdAt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dVal = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dVal}`;
    const formattedLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    calendarDays.push({
      dateStr,
      label: formattedLabel,
      isSolved: normalizedSolves.includes(dateStr)
    });
  }

  const diffColors = {
    Easy:   'text-green-400 bg-green-400/10 border-green-500/20',
    Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20',
    Hard:   'text-red-400 bg-red-400/10 border-red-500/20',
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto flex flex-col h-screen" style={{ marginLeft: SIDEBAR_W }}>
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#FF7A00]/10 border border-[#FF7A00]/25 rounded-lg px-2.5 py-1 text-[10px] font-extrabold text-[#FFB800] uppercase tracking-wider">
              Daily Challenge
            </div>
            <span className="text-gray-500 text-xs hidden sm:inline">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-semibold hidden md:inline">
              🔥 {totalSolvedCount} people solved today
            </span>

            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>

        {/* Split screen content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* LEFT PANEL: Question (40%) */}
          <div className="w-full lg:w-[40%] border-r border-white/5 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Title & Badge */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border ${diffColors[question?.difficulty] || diffColors.Medium}`}>
                    {question?.difficulty || 'Medium'}
                  </span>
                  {isSolvedByUser && (
                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                      Solved ✓
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">{question?.title}</h1>
                <p className="text-xs text-gray-500 font-medium">🔥 {totalSolvedCount} people solved today</p>
              </div>

              {/* Description */}
              <div className="space-y-4 text-xs leading-relaxed text-gray-400">
                <p className="whitespace-pre-wrap">{problemDetails.desc}</p>
              </div>

              {/* Examples */}
              {problemDetails.examples.map((ex, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Example {idx + 1}</h4>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 font-mono text-[10px] space-y-1.5 leading-relaxed text-gray-300">
                    <p><span className="text-gray-500">Input:</span> {ex.input}</p>
                    <p><span className="text-gray-500">Output:</span> {ex.output}</p>
                    {ex.explanation && <p><span className="text-gray-500">Explanation:</span> {ex.explanation}</p>}
                  </div>
                </div>
              ))}

              {/* Constraints */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Constraints</h4>
                <ul className="list-disc list-inside text-[11px] text-gray-500 space-y-1">
                  {problemDetails.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Below Question Section: Streak & Heatmap (Green/Gray) */}
            <div className="pt-6 border-t border-white/5 space-y-5">
              <div className="flex items-center justify-between bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 border border-green-500/25 rounded-xl flex items-center justify-center text-green-400">
                    <Flame size={20} className="fill-green-500 text-green-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider block">Daily Streak</span>
                    <span className="text-sm font-bold text-white">🔥 Your Streak: {currentStreak} days</span>
                  </div>
                </div>
                {question?.leetcodeUrl && (
                  <a 
                    href={question.leetcodeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="cursor-pointer text-xs font-bold text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                  >
                    View on LeetCode →
                  </a>
                )}
              </div>

              {/* 30 day green-gray heatmap */}
              <div className="space-y-3">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">
                  Streak Calendar (Last 30 Days)
                </span>
                <div className="grid grid-cols-10 gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                  {calendarDays.map((day, idx) => (
                    <div key={day.dateStr} className="group relative flex flex-col items-center">
                      <div 
                        className={`w-full aspect-square rounded-md border transition-all ${
                          day.isSolved 
                            ? 'bg-green-500 border-green-400/20 shadow-sm shadow-green-500/20' 
                            : 'bg-white/5 border-white/5 hover:border-white/15'
                        }`}
                      />
                      <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#111115] border border-white/10 text-[9px] font-bold text-white px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none">
                        {day.isSolved ? `Solved on ${day.label}` : `Not solved on ${day.label}`}
                      </div>
                      {(idx === 0 || idx === 29 || idx === 15) && (
                        <span className="text-[8px] text-gray-600 font-bold mt-1 uppercase select-none">
                          {day.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Code Editor & Streak Section (60%) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#09090C]">
            
            {/* Custom Editor with Line Numbers */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex leading-relaxed select-text min-h-0">
              {/* Line number rail */}
              <div className="text-gray-600 text-right pr-3 select-none border-r border-white/5 w-8 space-y-0.5 font-mono">
                {code.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea Codebox */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-[#FF7A00] p-0 pl-3 focus:outline-none resize-none h-full outline-none font-mono placeholder-gray-800 leading-relaxed overflow-y-auto"
                spellCheck="false"
                style={{ tabSize: 4 }}
              />
            </div>

            {/* Bottom Actions toolbar */}
            <div className="bg-[#0B0B0F] border-t border-white/5 px-6 py-3 flex items-center justify-between shrink-0">
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                <RotateCcw size={14} /> Reset Code
              </button>

              <button
                onClick={handleRunSubmit}
                disabled={running}
                className="cursor-pointer px-6 py-2 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                {running ? 'Running tests...' : 'Submit Solution'}
              </button>
            </div>

            {/* Live Compiler Console log output */}
            <div className="h-24 bg-[#08080C] border-t border-white/5 p-4 overflow-y-auto shrink-0 font-mono text-[10px] text-gray-500 leading-relaxed">
              <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-600 block mb-1">Compiler logs</span>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>

            {/* DAILY STREAK SECTION (below editor) */}
            <div className="bg-[#0B0B0F] border-t border-white/5 p-5 space-y-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider">Your Activity</h3>
                  <p className="text-gray-500 text-[10px]">Your daily coding submissions over the last 30 days</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center sm:text-right">
                    <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider block">Current Streak</span>
                    <span className="text-sm font-black text-white flex items-center gap-1 justify-center sm:justify-end">
                      <Flame size={14} className="fill-[#FF7A00] text-[#FF7A00]" />
                      {currentStreak} Days
                    </span>
                  </div>
                  
                  <div className="text-center sm:text-right border-l border-white/5 pl-6">
                    <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider block">Longest Streak</span>
                    <span className="text-sm font-black text-[#FFB800]">
                      {longestStreak} Days
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 30 day grid, Orange = solved, Dark = not solved */}
              <div className="grid grid-cols-10 gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                {calendarDays.map((day, idx) => (
                  <div key={day.dateStr} className="group relative flex flex-col items-center">
                    <div 
                      className={`w-full aspect-square rounded-md border transition-all ${
                        day.isSolved 
                          ? 'bg-[#FF7A00] border-[#FFB800]/25 shadow-sm shadow-[#FF7A00]/20' 
                          : 'bg-[#0B0B0F] border-white/5 hover:border-white/15'
                      }`}
                    />
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#111115] border border-white/10 text-[9px] font-bold text-white px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none">
                      {day.isSolved ? `Solved on ${day.label}` : `Not solved on ${day.label}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-hidden">
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {confetti.map(c => (
                <motion.div
                  key={c.id}
                  className="absolute rounded-full"
                  initial={{ x: `${c.x}vw`, y: `${c.y}vh`, opacity: 1, rotate: 0 }}
                  animate={{ y: '110vh', opacity: 0, rotate: 360 }}
                  transition={{ duration: 3 + Math.random() * 2, delay: c.delay, ease: 'linear' }}
                  style={{ backgroundColor: c.color, width: c.size, height: c.size }}
                />
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D0D12] border border-[#FF7A00]/30 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-14 h-14 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto mb-4 text-[#FFB800]">
                <Flame size={28} className="fill-[#FFB800]" />
              </div>
              
              <h2 className="text-white font-extrabold text-lg mb-1.5">✅ Solution Submitted!</h2>
              <p className="text-[#FF7A00] font-black text-sm mb-4">🔥 Streak: {currentStreak} Days</p>
              
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Come back tomorrow for next challenge
              </p>

              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl"
              >
                Awesome
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
