import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { updateSolvedQuestions } from '../../store/authSlice';
import apiClient from '../../api/axios';
import Sidebar from '../../components/dashboard/Sidebar';
import QuestionLinks from '../../components/QuestionLinks';

// Hardcoded roadmap data
const ROADMAP = [
  {
    topic: "Arrays", icon: "🔢", color: "#FF7A00",
    patterns: [
      { name: "Two Pointers",
        keywords: ["two sum","three sum",
        "container with water","trapping rain"] },
      { name: "Sliding Window",
        keywords: ["maximum subarray",
        "minimum size subarray","longest substring",
        "find all anagrams"] },
      { name: "Prefix Sum",
        keywords: ["subarray sum","range sum",
        "product except self","running sum"] },
      { name: "Binary Search",
        keywords: ["search rotated","find minimum",
        "peak element","koko eating"] },
    ]
  },
  {
    topic: "Strings", icon: "🔤", color: "#8B5CF6",
    patterns: [
      { name: "String Manipulation",
        keywords: ["palindrome","reverse string",
        "anagram","valid parentheses"] },
      { name: "Sliding Window",
        keywords: ["longest substring without",
        "minimum window substring",
        "permutation in string"] },
    ]
  },
  {
    topic: "Linked List", icon: "🔗", color: "#06B6D4",
    patterns: [
      { name: "Fast & Slow Pointers",
        keywords: ["linked list cycle",
        "middle of linked list","nth node from end"] },
      { name: "Reversal",
        keywords: ["reverse linked list",
        "reorder list","palindrome linked"] },
      { name: "Merge",
        keywords: ["merge two sorted","merge k sorted",
        "sort list"] },
    ]
  },
  {
    topic: "Trees", icon: "🌳", color: "#22C55E",
    patterns: [
      { name: "DFS",
        keywords: ["maximum depth","path sum",
        "diameter","lowest common ancestor",
        "binary tree paths"] },
      { name: "BFS Level Order",
        keywords: ["level order","zigzag",
        "right side view","average of levels"] },
      { name: "BST",
        keywords: ["validate binary search",
        "kth smallest","insert into bst",
        "delete node"] },
    ]
  },
  {
    topic: "Graphs", icon: "🕸️", color: "#F59E0B",
    patterns: [
      { name: "BFS",
        keywords: ["word ladder","rotting oranges",
        "shortest path","open the lock"] },
      { name: "DFS",
        keywords: ["number of islands","clone graph",
        "pacific atlantic","surrounded regions"] },
      { name: "Topological Sort",
        keywords: ["course schedule","alien dictionary",
        "sequence reconstruction"] },
    ]
  },
  {
    topic: "Dynamic Programming", icon: "⚡", color: "#EF4444",
    patterns: [
      { name: "1D DP",
        keywords: ["climbing stairs","house robber",
        "coin change","decode ways","word break"] },
      { name: "2D DP",
        keywords: ["unique paths","minimum path sum",
        "edit distance","longest common subsequence"] },
      { name: "Knapsack",
        keywords: ["partition equal subset",
        "target sum","last stone weight",
        "ones and zeroes"] },
    ]
  },
  {
    topic: "Stack & Queue", icon: "📚", color: "#EC4899",
    patterns: [
      { name: "Monotonic Stack",
        keywords: ["daily temperatures",
        "next greater element",
        "largest rectangle","trapping rain water"] },
      { name: "Queue",
        keywords: ["sliding window maximum",
        "task scheduler","design circular queue"] },
    ]
  },
  {
    topic: "Heap", icon: "🏔️", color: "#6366F1",
    patterns: [
      { name: "Top K Elements",
        keywords: ["kth largest","top k frequent",
        "k closest points","sort characters"] },
      { name: "Merge K Lists",
        keywords: ["merge k sorted lists",
        "find median from data stream",
        "smallest range"] },
    ]
  }
];

const SIDEBAR_W = 224;

export default function Roadmap() {
  const [activeTopic, setActiveTopic] = useState(null);
  const [activePattern, setActivePattern] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoadingQ, setIsLoadingQ] = useState(false);

  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(s => s.auth);

  // Handle pattern selection and API fetch
  const handlePatternClick = async (pattern) => {
    setActivePattern(pattern);
    setIsLoadingQ(true);
    setQuestions([]);
    try {
      const params = pattern.keywords.join(',');
      const res = await apiClient.get(
        `/api/questions/pattern?keywords=${encodeURIComponent(params)}`
      );
      setQuestions(res.data);
    } catch (err) {
      console.error('Error fetching pattern questions:', err);
    } finally {
      setIsLoadingQ(false);
    }
  };

  // Toggle solved status (POST/DELETE to /api/user/solve/:id)
  const handleSolveToggle = async (questionId, isSolved) => {
    if (!isAuthenticated) return;
    try {
      let updatedList;
      if (isSolved) {
        const response = await apiClient.delete(`/api/user/solve/${questionId}`);
        updatedList = response.data;
      } else {
        const response = await apiClient.post(`/api/user/solve/${questionId}`);
        updatedList = response.data;
      }
      dispatch(updateSolvedQuestions(updatedList));
    } catch (err) {
      console.error('Error updating solved status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070F] flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content container */}
      <main
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{ marginLeft: SIDEBAR_W }}
      >
        {/* Header bar (sticky) */}
        <header
          className="sticky top-0 z-30 shrink-0 px-6 py-4 flex items-center justify-between border-b"
          style={{
            background: 'rgba(7,7,15,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottomColor: 'var(--border, rgba(255,255,255,0.06))'
          }}
        >
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <Map size={20} />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">DSA Roadmap</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3, #475569)' }}>
                Master patterns, not just problems
              </p>
            </div>
          </div>
        </header>

        {/* Body (flex, gap-6, p-6) */}
        <div className="flex-1 overflow-y-auto flex gap-6 p-6">
          
          {/* LEFT PANEL (w-72, flex-shrink-0) */}
          <div className="w-72 shrink-0 flex flex-col">
            <h2
              className="text-xs font-bold uppercase mb-3 select-none"
              style={{ color: 'var(--text-3, #475569)' }}
            >
              Topics
            </h2>
            <div className="space-y-2">
              {ROADMAP.map((topic) => {
                const isActive = activeTopic?.topic === topic.topic;
                return (
                  <motion.div
                    key={topic.topic}
                    whileHover={{ x: 3 }}
                    onClick={() => {
                      setActiveTopic(topic);
                      setActivePattern(null);
                      setQuestions([]);
                    }}
                    className="flex items-center gap-3 cursor-pointer select-none transition-colors border"
                    style={{
                      background: isActive ? `${topic.color}12` : 'var(--bg-card, #0F0F1A)',
                      borderColor: isActive ? topic.color : 'var(--border, rgba(255,255,255,0.06))',
                      borderRadius: '10px',
                      padding: '12px 16px'
                    }}
                  >
                    <span className="text-xl">{topic.icon}</span>
                    <span
                      className="text-sm font-semibold transition-colors"
                      style={{ color: isActive ? topic.color : 'var(--text-1, #F1F5F9)' }}
                    >
                      {topic.topic}
                    </span>
                    <span
                      className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--bg-hover, #141428)',
                        color: 'var(--text-3, #475569)'
                      }}
                    >
                      {topic.patterns.length} patterns
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL (flex-1) */}
          <div className="flex-1 min-w-0">
            
            {/* If !activeTopic: Center empty state */}
            {!activeTopic && (
              <div className="flex flex-col items-center justify-center py-20 h-full text-center">
                <span className="text-6xl select-none">🗺️</span>
                <h3 className="font-bold text-xl mt-4 text-white">Select a topic</h3>
                <p className="text-sm mt-2 max-w-xs text-center" style={{ color: 'var(--text-3, #475569)' }}>
                  Choose a topic from the left to explore its patterns and practice questions
                </p>
              </div>
            )}

            {/* If activeTopic */}
            {activeTopic && (
              <div className="space-y-6">
                
                {/* Topic header */}
                <div className="mb-6">
                  <div className="text-4xl select-none">{activeTopic.icon}</div>
                  <h2
                    className="font-bold text-2xl mt-2"
                    style={{ color: activeTopic.color }}
                  >
                    {activeTopic.topic}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3, #475569)' }}>
                    {activeTopic.patterns.length} patterns available
                  </p>
                </div>

                {/* Patterns grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {activeTopic.patterns.map((pattern) => {
                    const isActive = activePattern?.name === pattern.name;
                    return (
                      <motion.div
                        key={pattern.name}
                        whileHover={{ y: -2, borderColor: `${activeTopic.color}60` }}
                        onClick={() => handlePatternClick(pattern)}
                        className="cursor-pointer border transition-colors flex flex-col justify-between"
                        style={{
                          background: isActive ? `${activeTopic.color}10` : 'var(--bg-card, #0F0F1A)',
                          borderColor: isActive ? activeTopic.color : 'var(--border, rgba(255,255,255,0.06))',
                          borderRadius: '12px',
                          padding: '18px'
                        }}
                      >
                        <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-1, #F1F5F9)' }}>
                          {pattern.name}
                        </h4>
                        
                        {/* Keywords list */}
                        <div className="flex flex-wrap gap-1">
                          {pattern.keywords.slice(0, 3).map((kw) => (
                            <span
                              key={kw}
                              className="text-xs px-2 py-0.5 rounded-full select-none"
                              style={{
                                background: 'var(--bg-hover, #141428)',
                                color: 'var(--text-3, #475569)'
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* QUESTIONS SECTION (Show when activePattern !== null) */}
                {activePattern && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: activeTopic.color }}>
                          {activePattern.name}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3, #475569)' }}>
                          {questions.length} questions found
                        </p>
                      </div>
                      <button
                        onClick={() => setActivePattern(null)}
                        className="cursor-pointer text-xs transition-colors hover:text-white"
                        style={{ color: 'var(--text-3, #475569)' }}
                      >
                        &larr; All Patterns
                      </button>
                    </div>

                    {/* Loading status */}
                    {isLoadingQ && (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, idx) => (
                          <div
                            key={idx}
                            className="h-12 rounded-xl animate-pulse"
                            style={{ background: 'var(--bg-hover, #141428)' }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Empty status */}
                    {!isLoadingQ && questions.length === 0 && (
                      <div
                        className="border text-center p-8"
                        style={{
                          background: 'var(--bg-card, #0F0F1A)',
                          borderColor: 'var(--border, rgba(255,255,255,0.06))',
                          borderRadius: '12px'
                        }}
                      >
                        <p className="font-semibold text-white">No questions found</p>
                        <p className="text-sm mt-2 mb-4" style={{ color: 'var(--text-3, #475569)' }}>
                          Try searching these on LeetCode:
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {activePattern.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full select-none"
                              style={{
                                background: 'rgba(249,115,22,0.1)',
                                color: '#FF7A00'
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions table */}
                    {!isLoadingQ && questions.length > 0 && (
                      <div
                        className="border overflow-hidden"
                        style={{
                          background: 'var(--bg-card, #0F0F1A)',
                          borderColor: 'var(--border, rgba(255,255,255,0.06))',
                          borderRadius: '12px'
                        }}
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr
                                className="text-xs font-bold uppercase tracking-wider border-b"
                                style={{
                                  background: 'var(--bg-hover, #141428)',
                                  borderColor: 'var(--border, rgba(255,255,255,0.06))',
                                  color: 'var(--text-3, #475569)'
                                }}
                              >
                                <th className="px-6 py-4 w-16">#</th>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4 text-center w-28">Difficulty</th>
                                <th className="px-6 py-4 text-center w-28">Acceptance</th>
                                <th className="px-6 py-4 text-center w-24">Solved</th>
                                <th className="px-6 py-4 text-center w-48">Links</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#07070F]/50">
                              {questions.map((q, idx) => {
                                const isSolved = user?.solvedQuestions?.some(
                                  (sq) => sq.questionId === q._id
                                );

                                return (
                                  <tr
                                    key={q._id}
                                    className={`transition-colors text-sm hover:bg-[#141428]/30`}
                                    style={{
                                      background: isSolved ? 'rgba(34,197,94,0.05)' : 'transparent',
                                      borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))'
                                    }}
                                  >
                                    {/* # (index) */}
                                    <td className="px-6 py-4 font-mono text-xs" style={{ color: 'var(--text-3, #475569)' }}>
                                      {idx + 1}
                                    </td>

                                    {/* Title - Plain text only, line-through if solved */}
                                    <td className="px-6 py-4">
                                      <span
                                        className={`font-semibold ${
                                          isSolved ? 'line-through text-slate-500' : 'text-slate-200'
                                        }`}
                                      >
                                        {q.title}
                                      </span>
                                    </td>

                                    {/* Difficulty Badge */}
                                    <td className="px-6 py-4 text-center">
                                      <span
                                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                          q.difficulty === 'Easy'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : q.difficulty === 'Medium'
                                            ? 'bg-amber-500/10 text-amber-400'
                                            : 'bg-rose-500/10 text-rose-400'
                                        }`}
                                      >
                                        {q.difficulty}
                                      </span>
                                    </td>

                                    {/* Acceptance */}
                                    <td className="px-6 py-4 text-center font-mono text-xs" style={{ color: 'var(--text-3, #475569)' }}>
                                      {q.acceptance || 'N/A'}
                                    </td>

                                    {/* Solved Checkbox */}
                                    <td className="px-6 py-4 text-center">
                                      <input
                                        type="checkbox"
                                        checked={!!isSolved}
                                        onChange={() => handleSolveToggle(q._id, !!isSolved)}
                                        className="cursor-pointer h-4 w-4 rounded border-slate-850 bg-slate-950 text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00]"
                                      />
                                    </td>

                                    {/* External Links */}
                                    <td className="px-6 py-4 text-center">
                                      <QuestionLinks question={q} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
