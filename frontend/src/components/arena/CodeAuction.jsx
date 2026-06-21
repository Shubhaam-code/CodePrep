import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, ArrowLeft, HelpCircle, Award, CheckCircle2, AlertCircle, BookOpen, Code
} from 'lucide-react';

const auctionChallenges = [
  {
    id: 'auction_duplicate_number',
    title: 'Duplicate Number Detection',
    description: 'Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive. Find the duplicate number without modifying the array and using only constant extra space.',
    solutions: [
      {
        key: 'A',
        title: 'Solution A: Nested Scans',
        code: `def findDuplicate(nums):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] == nums[j]:\n                return nums[i]`,
        correctTime: 'O(N²)',
        correctSpace: 'O(1)'
      },
      {
        key: 'B',
        title: 'Solution B: Array Sorting',
        code: `def findDuplicate(nums):\n    nums.sort()\n    for i in range(1, len(nums)):\n        if nums[i] == nums[i-1]:\n            return nums[i]`,
        correctTime: 'O(N log N)',
        correctSpace: 'O(1)' // Assuming in-place sorting
      },
      {
        key: 'C',
        title: 'Solution C: Cycle Detection',
        code: `def findDuplicate(nums):\n    tortoise = nums[0]\n    hare = nums[0]\n    while True:\n        tortoise = nums[tortoise]\n        hare = nums[nums[hare]]\n        if tortoise == hare: break\n    \n    tortoise = nums[0]\n    while tortoise != hare:\n        tortoise = nums[tortoise]\n        hare = nums[hare]\n    return hare`,
        correctTime: 'O(N)',
        correctSpace: 'O(1)'
      }
    ],
    bestSolution: 'C',
    explanation: 'Solution C (Floyd\'s Cycle Finding algorithm) runs in linear time O(N) and uses constant O(1) space, satisfying all constraints without modifying the input array.'
  },
  {
    id: 'auction_max_subarray',
    title: 'Maximum Subarray (Kadane\'s)',
    description: 'Given an integer array nums, find the subarray with the largest sum and return its sum.',
    solutions: [
      {
        key: 'A',
        title: 'Solution A: Cubic Scans',
        code: `def maxSubArray(nums):\n    max_sum = float('-inf')\n    for i in range(len(nums)):\n        for j in range(i, len(nums)):\n            current_sum = sum(nums[i:j+1])\n            max_sum = max(max_sum, current_sum)\n    return max_sum`,
        correctTime: 'O(N³)',
        correctSpace: 'O(1)'
      },
      {
        key: 'B',
        title: 'Solution B: Divide & Conquer',
        code: `def maxSubArray(nums):\n    # Recursive partition divide and conquer\n    # Splitting left, right, and crossing segments...\n    # Returns mid-max values recursively.`,
        correctTime: 'O(N log N)',
        correctSpace: 'O(log N)'
      },
      {
        key: 'C',
        title: 'Solution C: Kadane\'s Loop',
        code: `def maxSubArray(nums):\n    max_so_far = nums[0]\n    curr_max = nums[0]\n    for i in range(1, len(nums)):\n        curr_max = max(nums[i], curr_max + nums[i])\n        max_so_far = max(max_so_far, curr_max)\n    return max_so_far`,
        correctTime: 'O(N)',
        correctSpace: 'O(1)'
      }
    ],
    bestSolution: 'C',
    explanation: 'Solution C (Kadane\'s Algorithm) resolves the maximum subarray sum in a single O(N) scan using O(1) auxiliary memory.'
  }
];

const complexityOptions = ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'O(N²)', 'O(N³)'];

export default function CodeAuction({ onBack }) {
  const [points, setPoints] = useState(1000);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [bidAmount, setBidAmount] = useState(100);
  const [activeTab, setActiveTab] = useState('A');
  
  // User predictions
  const [predictedBest, setPredictedBest] = useState('A');
  const [complexities, setComplexities] = useState({
    A: { time: 'O(N)', space: 'O(1)' },
    B: { time: 'O(N)', space: 'O(1)' },
    C: { time: 'O(N)', space: 'O(1)' }
  });

  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'active' | 'results'
  const [results, setResults] = useState(null);

  const challenge = auctionChallenges[challengeIdx];

  const handleStartAuction = (idx) => {
    setChallengeIdx(idx);
    setGameState('active');
    setBidAmount(Math.min(100, points));
    setActiveTab('A');
    setPredictedBest('A');
    setComplexities({
      A: { time: 'O(N)', space: 'O(1)' },
      B: { time: 'O(N)', space: 'O(1)' },
      C: { time: 'O(N)', space: 'O(1)' }
    });
  };

  const handleComplexChange = (solKey, field, value) => {
    setComplexities(prev => ({
      ...prev,
      [solKey]: {
        ...prev[solKey],
        [field]: value
      }
    }));
  };

  const handleSubmitPredictions = () => {
    // Check optimal solution prediction
    const bestCorrect = predictedBest === challenge.bestSolution;
    
    // Check individual solution complexities
    let complexitiesCorrect = true;
    const details = [];

    challenge.solutions.forEach(s => {
      const userT = complexities[s.key].time;
      const userS = complexities[s.key].space;
      const correctT = s.correctTime;
      const correctS = s.correctSpace;

      const isTimeCorrect = userT === correctT;
      const isSpaceCorrect = userS === correctS;

      if (!isTimeCorrect || !isSpaceCorrect) {
        complexitiesCorrect = false;
      }

      details.push({
        key: s.key,
        name: s.title,
        userTime: userT,
        correctTime: correctT,
        userSpace: userS,
        correctSpace: correctS,
        timeCorrect: isTimeCorrect,
        spaceCorrect: isSpaceCorrect
      });
    });

    const win = bestCorrect && complexitiesCorrect;
    const finalPointsChange = win ? bidAmount : -bidAmount;
    const newPoints = points + finalPointsChange;
    setPoints(newPoints);

    setResults({
      win,
      pointsChange: finalPointsChange,
      bestCorrect,
      complexitiesCorrect,
      details,
      explanation: challenge.explanation
    });

    setGameState('results');
  };

  return (
    <div className="min-h-[550px] flex flex-col justify-between text-gray-300">
      
      {/* HEADER POINT BAR */}
      <div className="bg-[#0D0D12] border border-white/5 px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg">
        <span className="text-xs text-gray-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <Coins size={14} className="text-[#FFB800]" />
          Point Balance
        </span>
        <span className="text-sm font-black text-white">{points} pts</span>
      </div>

      {/* 1. SELECTION LOBBY */}
      {gameState === 'lobby' && (
        <div className="max-w-2xl mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl relative mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[#FF5500]">
              <Coins size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Code Auction Lobby</h2>
              <p className="text-gray-500 text-xs">Predict optimal code paths and auction complexity calculations</p>
            </div>
            <button onClick={onBack} className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl cursor-pointer">
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Select Auction Problem</span>
            {auctionChallenges.map((c, idx) => (
              <div 
                key={c.id}
                onClick={() => handleStartAuction(idx)}
                className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#FF7A00]/20 p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div>
                  <h4 className="text-white font-bold text-sm group-hover:text-[#FFB800] transition-colors">{c.title}</h4>
                  <p className="text-gray-500 text-[10px] truncate max-w-sm mt-0.5">{c.description}</p>
                </div>
                <span className="text-xs text-[#FF7A00] font-bold group-hover:translate-x-1 transition-transform">Enter Duel →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE AUCTION GAME */}
      {gameState === 'active' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 min-h-[500px]">
          
          {/* Left panel Complexity analysis selection */}
          <div className="bg-[#0D0D12] border border-white/5 p-5 rounded-3xl flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-[#FF7A00]" />
                <span className="text-xs text-white font-bold">{challenge.title}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed leading-normal">{challenge.description}</p>

              {/* Selector configurations */}
              <div className="space-y-4 pt-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Set Complexity Bids</span>
                
                {challenge.solutions.map(s => (
                  <div key={s.key} className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-white shrink-0">{s.title.split(':')[0]}</span>
                    
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Time</span>
                        <select
                          value={complexities[s.key].time}
                          onChange={(e) => handleComplexChange(s.key, 'time', e.target.value)}
                          className="bg-[#0B0B0F] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-300 cursor-pointer outline-none focus:ring-0"
                        >
                          {complexityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div>
                        <span className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Space</span>
                        <select
                          value={complexities[s.key].space}
                          onChange={(e) => handleComplexChange(s.key, 'space', e.target.value)}
                          className="bg-[#0B0B0F] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-300 cursor-pointer outline-none focus:ring-0"
                        >
                          {complexityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Optimal Solution Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Which solution is optimal?</span>
                <div className="grid grid-cols-3 gap-2">
                  {['A', 'B', 'C'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setPredictedBest(opt)}
                      className={`cursor-pointer py-2 text-xs font-bold rounded-xl border transition-all ${
                        predictedBest === opt
                          ? 'bg-[#FF7A00] border-[#FFB800]/25 text-black font-extrabold'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      Solution {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bidding Panel */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold">Your Point Bid</span>
                <span className="text-sm font-black text-[#FFB800]">{bidAmount} pts</span>
              </div>
              <input
                type="range"
                min="50"
                max={Math.min(500, points)}
                step="50"
                value={bidAmount}
                onChange={(e) => setBidAmount(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF7A00]"
              />

              <button
                onClick={handleSubmitPredictions}
                className="w-full py-3 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                Auction Predictions
              </button>
            </div>
          </div>

          {/* Right panel Solution code tabs */}
          <div className="bg-[#09090C] border border-white/5 rounded-3xl flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="bg-[#0D0D12] border-b border-white/5 p-3 flex gap-2">
              {challenge.solutions.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveTab(s.key)}
                  className={`cursor-pointer px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === s.key 
                      ? 'bg-white/5 text-white font-extrabold' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Solution {s.key}
                </button>
              ))}
            </div>

            {/* Code Block Render */}
            <div className="flex-1 p-5 overflow-auto font-mono text-[11px] leading-relaxed text-green-400 select-text">
              <div className="flex items-center gap-1.5 text-gray-600 text-[9px] uppercase font-black tracking-widest pb-3 border-b border-white/[0.03] mb-4">
                <Code size={11} /> Implementation Block
              </div>
              <pre className="whitespace-pre-wrap font-mono">
                {challenge.solutions.find(s => s.key === activeTab)?.code}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESULTS SCREEN */}
      {gameState === 'results' && results && (
        <div className="max-w-xl mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl relative mt-4 overflow-hidden">
          <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />

          <div className="text-center space-y-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto text-lg ${
              results.win ? 'bg-green-500/10 text-green-400 border border-green-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'
            }`}>
              {results.win ? '🏆' : '❌'}
            </div>
            
            <h2 className="text-xl font-black text-white">
              {results.win ? 'Prediction Successful!' : 'Prediction Failed'}
            </h2>
            <span className={`text-sm font-black inline-block px-3 py-1 rounded-xl border ${
              results.win ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {results.win ? `+${results.pointsChange}` : `${results.pointsChange}`} Points
            </span>
          </div>

          {/* Detailed results report */}
          <div className="space-y-3">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Auction Analysis Breakdown</span>
            <div className="space-y-2.5">
              {/* Best solution match */}
              <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-white block">Best Solution Prediction</span>
                  <span className="text-[10px] text-gray-500">Correct Optimal: Solution {challenge.bestSolution}</span>
                </div>
                <span className={`text-xs font-extrabold ${results.bestCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {results.bestCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                </span>
              </div>

              {/* Complexities table list */}
              {results.details.map(item => (
                <div key={item.key} className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.02] pb-1.5">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className={`text-[10px] font-extrabold ${item.timeCorrect && item.spaceCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {item.timeCorrect && item.spaceCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500">
                    <div>
                      <span>Time Complexity: </span>
                      <strong className={item.timeCorrect ? 'text-green-400' : 'text-red-400'}>{item.userTime}</strong>
                      <span className="text-gray-700"> (Correct: {item.correctTime})</span>
                    </div>

                    <div>
                      <span>Space Complexity: </span>
                      <strong className={item.spaceCorrect ? 'text-green-400' : 'text-red-400'}>{item.userSpace}</strong>
                      <span className="text-gray-700"> (Correct: {item.correctSpace})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical explanations card */}
          <div className="bg-white/[0.01] border border-[#FF7A00]/20 p-4 rounded-2xl space-y-2.5">
            <span className="text-[9px] uppercase font-black text-[#FFB800] tracking-wider block">Optimal complexity Explanation</span>
            <p className="text-xs text-gray-400 leading-normal leading-relaxed">{results.explanation}</p>
          </div>

          <button 
            onClick={() => setGameState('lobby')}
            className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Play Next Auction
          </button>
        </div>
      )}

    </div>
  );
}
