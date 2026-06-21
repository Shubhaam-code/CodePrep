import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Building, ArrowRight, Layers, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/store';
import apiClient from '../../api/axios';

import Sidebar from '../../components/dashboard/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

// Generates a beautiful gradient avatar background color based on first letter
const getColorForLetter = (letter) => {
  const charCode = (letter || 'A').toUpperCase().charCodeAt(0);
  const colors = [
    'from-red-500 to-rose-600',
    'from-orange-500 to-amber-600',
    'from-yellow-500 to-yellow-600',
    'from-green-500 to-emerald-600',
    'from-teal-500 to-cyan-600',
    'from-blue-500 to-indigo-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-indigo-500 to-violet-600',
    'from-violet-500 to-purple-600',
  ];
  return colors[charCode % colors.length];
};

export default function DSAPractice() {
  const SIDEBAR_W = 224;
  const { user } = useAppSelector((state) => state.auth);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('A-Z'); // 'A-Z' | 'Most Questions' | 'My Progress'

  // 1. Fetch companies
  const { data: companies = [], isLoading: loadingCos, isError: errorCos } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch dashboard data to map resolved company totals and solved progress counts
  const { data: dashboardData, isLoading: loadingDash } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/user/dashboard');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const isLoading = loadingCos || loadingDash;

  if (errorCos) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
        <ErrorMessage message="Failed to load tech companies list." />
      </div>
    );
  }

  // Format and calculate stats per company
  const formattedCompanies = companies.map(company => {
    // Capitalize name, replace dash with space
    const formattedName = company
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const stats = dashboardData?.solvedByCompany?.find(
      c => c.company.toLowerCase() === company.toLowerCase()
    ) || { solved: 0, total: 0 };

    return {
      rawName: company,
      name: formattedName,
      solved: stats.solved,
      total: stats.total,
    };
  });

  // Live filtering by search query
  const filtered = formattedCompanies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'A-Z') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'Most Questions') {
      return b.total - a.total;
    } else if (sortBy === 'My Progress') {
      // Sort by solved questions count, secondary by name
      if (b.solved !== a.solved) {
        return b.solved - a.solved;
      }
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Sticky Header with controls */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-white font-bold text-lg">DSA Practice</h1>
            <p className="text-gray-500 text-xs">Practice coding challenges asked by top-tier tech companies</p>
          </div>
          
          {/* Controls: Search and Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 w-full sm:w-60">
              <Search size={14} className="text-gray-500" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..." 
                className="bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none w-full" 
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5">
              <ArrowUpDown size={13} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-gray-400 outline-none cursor-pointer border-none p-0 focus:ring-0"
              >
                <option value="A-Z" className="bg-[#0D0D12]">Sort: A-Z</option>
                <option value="Most Questions" className="bg-[#0D0D12]">Sort: Most Questions</option>
                <option value="My Progress" className="bg-[#0D0D12]">Sort: My Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6">
          {isLoading ? (
            /* Skeleton Cards Shimmer Loader */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#0D0D12] border border-white/5 rounded-2xl p-5 h-48 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="w-4 h-4 bg-white/5 rounded" />
                  </div>
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-8 bg-white/5 rounded-xl w-full pt-4" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 bg-[#0D0D12]/20 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
              No companies found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sorted.map((company, i) => {
                const firstLetter = company.name[0] || 'C';
                const avatarGradient = getColorForLetter(firstLetter);

                return (
                  <motion.div
                    key={company.rawName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Link 
                      to={`/company/${company.rawName}`}
                      className="group relative bg-[#0D0D12] border border-white/5 hover:border-[#FF7A00]/30 rounded-2xl p-5 block transition-all duration-300 overflow-hidden"
                    >
                      {/* Hover overlay glow */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#FF7A00]/5 to-transparent pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/0 to-transparent group-hover:via-[#FF7A00]/30 transition-all" />

                      <div className="flex items-center justify-between mb-4">
                        {/* Company Letter Avatar */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-lg text-white capitalize select-none shadow-md`}>
                          {firstLetter}
                        </div>
                        <Building size={15} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>

                      <h3 className="text-white font-bold text-base mb-1 group-hover:text-[#FFB800] transition-colors truncate">
                        {company.name}
                      </h3>

                      {/* Metadata row */}
                      <div className="space-y-1 text-xs text-gray-500 mb-5">
                        <div className="flex items-center gap-1.5">
                          <Layers size={11} className="text-[#FF7A00]" />
                          <span>{company.total} Real Questions</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Your progress: <span className="text-gray-300 font-semibold">{company.solved} solved</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-[#FF7A00] group-hover:text-[#FFB800] transition-colors pt-2 border-t border-white/5">
                        <span>Practice Now</span>
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
