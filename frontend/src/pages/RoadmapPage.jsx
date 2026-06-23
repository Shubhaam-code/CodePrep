import React from 'react';
import { motion } from 'framer-motion';
import {
  FaCodeBranch as Map, FaTrophy as Flag, FaSearch as Compass,
  FaArrowRight as ChevronRight, FaArrowRight as ArrowRight
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';

export default function RoadmapPage() {
  const SIDEBAR_W = 224;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Top Navbar Header */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map size={18} className="text-[#FF7A00]" />
            <h1 className="text-white font-bold text-lg">Roadmap</h1>
          </div>
          <div className="flex items-center gap-2 bg-[#FF7A00]/10 border border-[#FF7A00]/25 rounded-xl px-3 py-1 text-xs text-[#FFB800] font-extrabold uppercase tracking-wider">
            <Compass size={12} /> Guided Journey
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-3xl p-8 overflow-hidden border border-white/8 bg-gradient-to-br from-[#12121A] to-[#0A0A0F] shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB800]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-[#FFB800]">
                <Flag size={12} /> Interview Preparation Map
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Your Roadmap to Technical Excellence
              </h2>
              <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
                Welcome to the Roadmap route. This page represents your structured path to mastering DSA and System Design. Access curated topics organized week-by-week, monitor your progress bar, and complete milestones designed to crack interviews at top-tier organizations.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/dashboard/roadmap')}
                  className="cursor-pointer px-5 py-2.5 font-bold text-sm text-black bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 rounded-xl shadow-lg shadow-[#FF7A00]/10 flex items-center gap-2 transition"
                >
                  Enter Main Roadmap <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Timeline Milestones Placeholder */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-base px-1">Curriculum Highlights</h3>
            
            <div className="relative border-l border-white/10 pl-6 ml-4 space-y-6">
              <div className="relative">
                <span className="absolute -left-[33px] top-1 w-4.5 h-4.5 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFB800] border-4 border-[#0B0B0F]" />
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-sm">Milestone 1: Data Structures Foundation</h4>
                    <p className="text-gray-500 text-xs mt-0.5">Arrays, Hashing, Linked Lists, Stacks & Queues</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-[33px] top-1 w-4.5 h-4.5 rounded-full bg-[#0D0D12] border-4 border-white/10" />
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-sm">Milestone 2: Algorithmic Paradigms</h4>
                    <p className="text-gray-500 text-xs mt-0.5">Recursion, Trees, Graphs, BFS & DFS Traversals</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-[33px] top-1 w-4.5 h-4.5 rounded-full bg-[#0D0D12] border-4 border-white/10" />
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-sm">Milestone 3: Advanced Optimization</h4>
                    <p className="text-gray-500 text-xs mt-0.5">Dynamic Programming, Greedy Algorithms, System Design Basics</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
