import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Search, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { useAppSelector } from '../store/store';

import Sidebar from '../components/dashboard/Sidebar';
import StatsCards from '../components/dashboard/StatsCards';
import CompanyTracker from '../components/dashboard/CompanyTracker';
import ActivityChart from '../components/dashboard/ActivityChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const topCompanies = [
  { name: 'Google', slug: 'google', desc: 'Practice top-asked questions at Google.', color: '#4285F4' },
  { name: 'Amazon', slug: 'amazon', desc: 'Ace the Amazon online assessment.', color: '#FF9900' },
  { name: 'Microsoft', slug: 'microsoft', desc: 'Solve common coding questions at Microsoft.', color: '#00A4EF' }
];

export default function Dashboard() {
  const SIDEBAR_W = 224; // 56*4 = w-56
  const { user: authUser } = useAppSelector((state) => state.auth);

  // Fetch real dashboard statistics
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/api/user/dashboard');
      return response.data;
    },
    staleTime: 60 * 1000, // cache for 1 minute
  });

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
        <ErrorMessage message={error?.message || 'Failed to load dashboard data.'} />
      </div>
    );
  }

  const { totalSolved = 0, totalBookmarked = 0, streak = {}, solvedByCompany = [], recentSolved = [] } = data || {};
  const lastActive = streak?.lastSolvedDate 
    ? new Date(streak.lastSolvedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Dashboard Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: SIDEBAR_W }}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Good morning, {authUser?.name || 'Engineer'}! 👋</h1>
            <p className="text-gray-500 text-xs">
              {totalBookmarked > 0 
                ? `You have ${totalBookmarked} bookmarked questions saved` 
                : 'Stay consistent and practice daily!'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 w-48">
              <Search size={13} className="text-gray-500" />
              <input placeholder="Search problems..." className="bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none w-full" />
            </div>
            {/* Bell */}
            <button className="relative w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Bell size={14} />
              {streak?.current > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#FF7A00] rounded-full" />}
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FFD700] flex items-center justify-center text-black font-bold text-sm cursor-pointer capitalize">
              {authUser?.name ? authUser.name[0] : <User size={14} />}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <StatsCards 
            totalSolved={totalSolved} 
            streak={streak?.current || 0} 
            totalBookmarked={totalBookmarked} 
            lastActive={lastActive} 
          />

          {totalSolved === 0 ? (
            /* Empty State for New Users */
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 text-center my-6 max-w-4xl mx-auto shadow-xl">
              <h2 className="text-2xl font-extrabold text-white mb-2">
                Welcome {authUser?.name || 'Engineer'}! Ready to crack your interview?
              </h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                Start practicing company-wise DSA questions to track your progress and ace target interviews.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto mb-8">
                {topCompanies.map((company) => (
                  <Link to={`/company/${company.slug}`} key={company.slug} className="group relative bg-[#0D0D12] border border-white/5 hover:border-[#FF7A00]/30 rounded-2xl p-6 text-left transition-all duration-300">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#FF7A00]/5 to-transparent rounded-2xl pointer-events-none" />
                    <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center font-extrabold text-lg text-black" style={{ backgroundColor: company.color }}>
                      {company.name[0]}
                    </div>
                    <h3 className="text-white font-bold text-base mb-1.5 group-hover:text-[#FFB800] transition-colors">{company.name}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{company.desc}</p>
                  </Link>
                ))}
              </div>

              <Link to="/dashboard/dsa" className="inline-flex items-center gap-2 text-sm font-bold text-black px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFD700] hover:opacity-90 transition-opacity">
                Start Practicing <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            /* Standard Dashboard Content */
            <>
              {/* Middle Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Activity Chart */}
                <div className="lg:col-span-2">
                  <ActivityChart recentSolved={recentSolved} />
                </div>
                {/* Company Tracker */}
                <CompanyTracker solvedByCompany={solvedByCompany} />
              </div>

            </>
          )}
        </div>
      </main>
    </div>
  );
}
