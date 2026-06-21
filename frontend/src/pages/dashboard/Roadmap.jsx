import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Calendar, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/dashboard/Sidebar';

const weeksData = [
  { id: 1, subtitle: 'Week 1-2', title: 'Arrays & Strings', count: 15, topics: ['Two Sum', 'Sliding Window', 'Two Pointers', 'Subarray Sums', 'String Palindromes'] },
  { id: 2, subtitle: 'Week 3-4', title: 'Linked Lists & Stacks', count: 12, topics: ['Reverse List', 'Detect Cycle', 'Valid Parentheses', 'Queue using Stack', 'LRU Cache'] },
  { id: 3, subtitle: 'Week 5-6', title: 'Trees & BST', count: 18, topics: ['Inorder Traversal', 'Max Depth', 'LCA of Binary Tree', 'Validate BST', 'Serialize Tree'] },
  { id: 4, subtitle: 'Week 7-8', title: 'Graphs & BFS/DFS', count: 14, topics: ['Number of Islands', 'Clone Graph', 'Course Schedule', 'Dijkstra Algorithm', 'Topological Sort'] },
  { id: 5, subtitle: 'Week 9-10', title: 'Dynamic Programming', count: 20, topics: ['Climbing Stairs', 'LCS', 'Knapsack 0-1', 'Coin Change', 'Longest Path'] },
  { id: 6, subtitle: 'Week 11-12', title: 'System Design Basics', count: 10, topics: ['Horizontal Scaling', 'Load Balancers', 'Caching & CDNs', 'Database Sharding', 'API Gateways'] },
];

export default function Roadmap() {
  const SIDEBAR_W = 224;
  const [completed, setCompleted] = useState([]);

  // Load completed weeks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('codeprep_roadmap_completed');
    if (saved) {
      try {
        setCompleted(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load roadmap progress:', e);
      }
    }
  }, []);

  const toggleComplete = (id) => {
    let updated;
    if (completed.includes(id)) {
      updated = completed.filter(x => x !== id);
    } else {
      updated = [...completed, id];
    }
    setCompleted(updated);
    localStorage.setItem('codeprep_roadmap_completed', JSON.stringify(updated));
  };

  const progress = Math.round((completed.length / weeksData.length) * 100);

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">DSA & Interview Roadmap</h1>
            <p className="text-gray-500 text-xs">Step-by-step preparation path to crack top tech coding rounds</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">Total Progress</span>
            <span className="text-xs font-bold text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
              {completed.length} / {weeksData.length} Weeks
            </span>
          </div>
        </div>

        {/* Roadmap content */}
        <div className="p-6 max-w-4xl mx-auto space-y-8">
          
          {/* Progress Banner */}
          <div className="bg-white/[0.02] border border-white/8 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-gray-400">Roadmap Progress</span>
              <span className="text-[#FFB800]">{progress}% Completed</span>
            </div>
            <div className="w-full bg-[#0B0B0F] h-3.5 rounded-full overflow-hidden border border-white/5 p-0.5">
              <motion.div 
                className="bg-gradient-to-r from-[#FF7A00] to-[#FFD700] h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Node Graph Timeline */}
          <div className="relative border-l border-white/10 pl-6 sm:pl-8 ml-4 space-y-12">
            {weeksData.map((week, idx) => {
              const isCompleted = completed.includes(week.id);
              return (
                <motion.div 
                  key={week.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="relative"
                >
                  {/* Timeline connector circle node */}
                  <span className="absolute -left-[35px] sm:-left-[43px] top-1.5 flex items-center justify-center">
                    <button 
                      onClick={() => toggleComplete(week.id)}
                      className={`cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-[#FF7A00] text-black shadow-lg shadow-[#FF7A00]/40' 
                          : 'bg-[#0D0D12] border-2 border-white/10 text-gray-500 hover:border-[#FF7A00]/50'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                  </span>

                  {/* Glass week container */}
                  <div className={`bg-white/[0.02] border rounded-2xl p-6 transition-all duration-300 ${
                    isCompleted ? 'border-[#FF7A00]/30 shadow-[0_0_20px_rgba(255,122,0,0.05)]' : 'border-white/5'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#FF7A00] flex items-center gap-1.5 mb-1">
                          <Calendar size={10} />
                          {week.subtitle}
                        </span>
                        <h2 className={`text-base sm:text-lg font-bold transition-colors ${isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {week.title}
                        </h2>
                      </div>
                      <button 
                        onClick={() => toggleComplete(week.id)}
                        className={`cursor-pointer shrink-0 px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                          isCompleted 
                            ? 'bg-transparent border-[#FF7A00]/35 text-[#FF7A00] hover:bg-[#FF7A00]/5' 
                            : 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] border-transparent text-black hover:opacity-90'
                        }`}
                      >
                        {isCompleted ? 'Completed ✓' : 'Mark Complete'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Topics wrap */}
                      <div className="flex flex-wrap gap-1.5">
                        {week.topics.map(t => (
                          <Link 
                            key={t} 
                            to={`/topic/${encodeURIComponent(t)}`}
                            className="cursor-pointer text-[10px] font-semibold text-gray-400 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 hover:text-[#FF7A00] hover:border-[#FF7A00]/30 hover:bg-[#FF7A00]/5 transition-all"
                          >
                            {t}
                          </Link>
                        ))}
                      </div>

                      {/* Rec question count */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Bookmark size={12} className="text-[#FFB800]" />
                        <span>Recommended target: solve {week.count} problems</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
}
