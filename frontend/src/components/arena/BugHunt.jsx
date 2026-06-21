import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bug, RotateCcw, AlertTriangle, HelpCircle, CheckCircle, XCircle, ArrowLeft, Play, Clock, Award
} from 'lucide-react';
import { JudgeService } from '../../services/JudgeService';
import apiClient from '../../api/axios';

const bugHuntChallenges = [
  {
    id: 'bughunt_two_sum',
    title: 'Buggy Two Sum (Python)',
    difficulty: 'Easy',
    isBugHunt: true,
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nBUG INFO: The implementation below incorrectly returns matching the exact same element twice (e.g. on nums=[3,2,4], target=6 it returns [0,0] instead of [1,2]). Find and fix the line order!`,
    initialCode: `def solve(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        # BUG: Storing seen elements before validating lookup match\n        seen[n] = i\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n    return []\n`,
    hint: 'Move the registration of the currently visited number in the seen map to execute AFTER the matching target lookup condition has been verified.'
  },
  {
    id: 'bughunt_binary_search',
    title: 'Infinite Binary Search (JavaScript)',
    difficulty: 'Medium',
    isBugHunt: true,
    description: `Given a sorted array of integers nums and a target value, return the index of target if found. Otherwise, return -1.\n\nBUG INFO: The search loop hangs in an infinite loop on inputs where target is at the end of the search bounds. Fix the boundary indexes!`,
    initialCode: `function solve(nums, target) {\n    let low = 0;\n    let high = nums.length - 1;\n    while (low <= high) {\n        let mid = Math.floor((low + high) / 2);\n        if (nums[mid] === target) return mid;\n        else if (nums[mid] < target) {\n            // BUG: Fails to increment boundary index pointer\n            low = mid; \n        } else {\n            high = mid - 1;\n        }\n    }\n    return -1;\n}\n`,
    hint: 'When the midpoint value is smaller than the target, the target must lie strictly to the right of mid. Thus, low should be set to mid + 1, not mid.'
  },
  {
    id: 'bughunt_valid_parentheses',
    title: 'Valid Parentheses Crash (JavaScript)',
    difficulty: 'Medium',
    isBugHunt: true,
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nBUG INFO: The code returns true on invalid substrings like "]" or crashes on stack overflows on trailing brackets. Fix stack checks and returns!`,
    initialCode: `function solve(s) {\n    let stack = [];\n    let map = { ')': '(', '}': '{', ']': '[' };\n    for (let char of s) {\n        if (char === '(' || char === '{' || char === '[') {\n            stack.push(char);\n        } else {\n            // BUG: Popping elements without empty-stack assertions\n            let top = stack.pop();\n            if (top !== map[char]) return false;\n        }\n    }\n    // BUG: Returning static true instead of checking empty state\n    return true;\n}\n`,
    hint: 'Ensure that you check stack emptiness during pop matches, and verify that the stack is completely empty (stack.length === 0) before returning true.'
  }
];

export default function BugHunt({ onBack }) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('Find the logical bug in the editor, patch it, and click "Submit Solution" to test.');
  const [running, setRunning] = useState(false);
  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'active' | 'success' | 'gameover'
  const [showHint, setShowHint] = useState(false);
  
  // Timer & Scoring
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);

  const challenge = bugHuntChallenges[challengeIdx];

  const handleStartGame = (idx) => {
    setChallengeIdx(idx);
    setCode(bugHuntChallenges[idx].initialCode);
    setGameState('active');
    setTimeLeft(300);
    setOutput('Bug Hunt workspace initialized. Find the logical bug!');
    setShowHint(false);
  };

  useEffect(() => {
    if (gameState === 'active') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setGameState('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleReset = () => {
    setCode(challenge.initialCode);
    setOutput('Code reset to initial buggy state.');
  };

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
    setRunning(true);
    setOutput('Running test assertions on buggy source code...\nEvaluating test suites...');

    const res = await JudgeService.validateSolution(code, challenge.language, challenge);
    
    setTimeout(() => {
      setRunning(false);
      setOutput(res.logs);

      if (res.status === 'passed') {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalScore = timeLeft * 10;
        setScore(finalScore);
        setGameState('success');
        
        // Save submission history as type 'playground' / 'arena'
        apiClient.post('/api/playground/submit', {
          questionId: '5f8d04f1c3b123456789abcd', // Seed mock ID or generic bug hunt ID
          code,
          language: challenge.title.includes('Python') ? 'python' : 'javascript'
        }).catch(err => console.error(err));
      }
    }, 1200);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[550px] flex flex-col justify-between text-gray-300">
      
      {/* 1. SELECTION LOBBY */}
      {gameState === 'lobby' && (
        <div className="max-w-2xl mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#FFB800]">
              <Bug size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bug Hunt Arena</h2>
              <p className="text-gray-500 text-xs">Scan and patch hidden bugs in pre-written algorithms</p>
            </div>
            <button onClick={onBack} className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl cursor-pointer">
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Select Debug Challenge</span>
            {bugHuntChallenges.map((c, idx) => (
              <div 
                key={c.id}
                onClick={() => handleStartGame(idx)}
                className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#FF7A00]/20 p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div>
                  <h4 className="text-white font-bold text-sm group-hover:text-[#FFB800] transition-colors">{c.title}</h4>
                  <span className="text-[10px] text-gray-500 font-medium">Difficulty: {c.difficulty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#FF7A00] font-bold group-hover:translate-x-1 transition-transform">Start Hunt →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE GAME */}
      {gameState === 'active' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
          {/* Left panel instructions */}
          <div className="w-full lg:w-[40%] border-r border-white/5 overflow-y-auto p-5 space-y-5 flex flex-col justify-between bg-[#0B0B0F]">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Bug Challenge</span>
                <span className="text-xs text-yellow-500 font-bold flex items-center gap-1.5">
                  <Clock size={13} className="animate-pulse" />
                  Time Left: {formatTime(timeLeft)}
                </span>
              </div>
              
              <h2 className="text-lg font-bold text-white">{challenge.title}</h2>
              <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                {challenge.description}
              </div>

              {/* Hints Box */}
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-2">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-xs text-[#FFB800] font-bold hover:text-white transition-colors cursor-pointer"
                >
                  <HelpCircle size={13} />
                  {showHint ? 'Hide Debug Hint' : 'Reveal Debug Hint'}
                </button>
                {showHint && (
                  <p className="text-[11px] text-gray-500 leading-relaxed animate-fade-in">
                    {challenge.hint}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-[10px] text-gray-500 flex items-center gap-1.5 justify-between">
              <span>Remaining time directly maps to score points multipliers.</span>
            </div>
          </div>

          {/* Right panel Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090C] border-l border-white/5">
            {/* Monospace textarea editor */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex leading-relaxed min-h-0">
              <div className="text-gray-600 text-right pr-3 select-none border-r border-white/5 w-8 space-y-0.5 font-mono">
                {code.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-green-400 p-0 pl-3 focus:outline-none resize-none h-full outline-none font-mono placeholder-gray-800 leading-relaxed overflow-y-auto"
                spellCheck="false"
                style={{ tabSize: 4 }}
              />
            </div>

            {/* Actions */}
            <div className="bg-[#0B0B0F] border-t border-white/5 px-6 py-3 flex items-center justify-between shrink-0">
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw size={13} /> Reset Original Buggy Code
              </button>

              <button
                onClick={handleRunSubmit}
                disabled={running}
                className="cursor-pointer px-6 py-2 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center gap-1"
              >
                {running ? 'Validating Patch...' : 'Submit Solution'}
              </button>
            </div>

            {/* Compiler Console output */}
            <div className="h-28 bg-[#08080C] border-t border-white/5 p-4 overflow-y-auto font-mono text-[10px] text-gray-500 leading-relaxed">
              <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-600 block mb-1">Execution logs</span>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUCCESS / SOLVED STATE */}
      {gameState === 'success' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-green-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto text-green-400">
            <CheckCircle size={28} />
          </div>
          
          <div className="space-y-1 relative">
            <h2 className="text-white font-black text-2xl">✅ Bug Successfully Patched!</h2>
            <p className="text-gray-400 text-xs">Your corrections successfully satisfied all compiler test cases.</p>
            
            <div className="flex items-center justify-center gap-4 pt-4 text-center">
              <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Time Solved</span>
                <span className="text-sm font-black text-white">{formatTime(300 - timeLeft)}</span>
              </div>
              <div className="bg-white/5 border border-[#FF7A00]/25 px-4 py-2 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Score Earned</span>
                <span className="text-sm font-black text-[#FFB800] flex items-center gap-1">
                  <Award size={14} /> {score} Points
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setGameState('lobby')}
            className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer relative"
          >
            Play Next Challenge
          </button>
        </div>
      )}

      {/* 4. GAME OVER TIMER OUT STATE */}
      {gameState === 'gameover' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-red-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle size={28} className="animate-bounce" />
          </div>
          
          <div className="space-y-1 relative">
            <h2 className="text-white font-black text-2xl">💀 Time Expired!</h2>
            <p className="text-gray-400 text-xs">You couldn't find the logical bug in time.</p>
          </div>

          <button 
            onClick={() => setGameState('lobby')}
            className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-xl cursor-pointer relative"
          >
            Try Again
          </button>
        </div>
      )}

    </div>
  );
}
