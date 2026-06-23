import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FaSearch as Search, FaArrowRight as ArrowRight, FaCheckCircle as CheckCircle2, FaBuilding as Building } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import apiClient from '../../api/axios';

import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const companyColors = {
  google: '#4285F4',
  amazon: '#FF9900',
  microsoft: '#00A4EF',
  meta: '#1877F2',
  apple: '#A2AAAD',
  netflix: '#E50914',
  adobe: '#FF0000',
  uber: '#FFFFFF',
  goldman_sachs: '#FFB800',
  atlassian: '#0052CC',
};

export default function CompaniesPage() {
  const SIDEBAR_W = 224;
  const [search, setSearch] = useState('');

  // 1. Fetch companies
  const { data: companies, isLoading: loadingCos, isError: errorCos } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch dashboard data (containing user progress details)
  const { data: dashboardData, isLoading: loadingDash } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/user/dashboard');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  if (loadingCos || loadingDash) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (errorCos) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
        <ErrorMessage message="Failed to load tech companies list." />
      </div>
    );
  }

  // Create progress lookup maps
  const progressMap = {};
  if (dashboardData?.solvedByCompany) {
    dashboardData.solvedByCompany.forEach(c => {
      progressMap[c.company.toLowerCase()] = {
        solved: c.solved,
        total: c.total
      };
    });
  }

  // Filter list
  const filtered = (companies || []).filter(c =>
    c.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Header and Search */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-white font-bold text-lg">Companies Directory</h1>
            <p className="text-gray-500 text-xs">Analyze your preparation statistics across target organizations</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 w-full sm:w-64 max-w-sm">
            <Search size={14} className="text-gray-500" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..." 
              className="bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none w-full" 
            />
          </div>
        </div>

        {/* Content body */}
        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
              No companies found matching search filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((company, i) => {
                const companyKey = company.toLowerCase().replace(/\s+/g, '_');
                const color = companyColors[companyKey] || '#FF7A00';
                
                // Get progress metrics
                const stats = progressMap[company.toLowerCase()] || { solved: 0, total: 0 };
                const pct = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;

                return (
                  <Link 
                    key={company} 
                    to={`/company/${company.toLowerCase()}`}
                    className="group relative bg-[#0D0D12] border border-white/5 hover:border-[#FF7A00]/30 rounded-2xl p-6 block transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#FF7A00]/5 to-transparent pointer-events-none" />
                    
                    <div className="flex items-start justify-between mb-5">
                      {/* Logo placeholder */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl text-black capitalize select-none" style={{ backgroundColor: color }}>
                        {company[0]}
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block font-medium">Progress</span>
                        <span className="text-xs font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg block mt-1">
                          {stats.solved} / {stats.total} Solved
                        </span>
                      </div>
                    </div>

                    <h3 className="text-white font-bold text-base mb-3 capitalize group-hover:text-[#FFB800] transition-colors">{company}</h3>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-6">
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                        <span>Completion Rate</span>
                        <span className="text-[#FFB800]">{pct}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${color}90, ${color})` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-[#FF7A00] group-hover:text-[#FFB800] transition-colors">
                      <span>Practice Now</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
