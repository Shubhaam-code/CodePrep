import React from 'react';
import { motion } from 'framer-motion';
import { History, Clock, FileText, BarChart2, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';

export default function HistoryPage() {
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
            <History size={18} className="text-[#FF7A00]" />
            <h1 className="text-white font-bold text-lg">Practice History</h1>
          </div>
          <div className="flex items-center gap-2 bg-[#FF7A00]/10 border border-[#FF7A00]/25 rounded-xl px-3 py-1 text-xs text-[#FFB800] font-extrabold uppercase tracking-wider">
            <Clock size={12} /> Live Sync
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B5CF6]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-[#8B5CF6]">
                <BarChart2 size={12} /> Performance Logs
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Review Your Progress Journey
              </h2>
              <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
                Welcome to the History route. This page represents your developer diary. Revisit all past submissions, review difficulty logs, check execution speed statistics, and analyze code details to identify areas for improvement.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/dashboard/history')}
                  className="cursor-pointer px-5 py-2.5 font-bold text-sm text-black bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 rounded-xl shadow-lg shadow-[#FF7A00]/10 flex items-center gap-2 transition"
                >
                  Enter Main History <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Activity Metrics Placeholder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Solved Problems</h4>
                <p className="text-gray-500 text-xs mt-1">Review the list of all problems you successfully completed and submitted.</p>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Submission Logs</h4>
                <p className="text-gray-500 text-xs mt-1">Detailed feedback of execution runtimes, memory usage, and language specs.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
