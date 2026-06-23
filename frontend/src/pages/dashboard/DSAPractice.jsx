import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Code2 } from 'lucide-react';
import Sidebar from '../../components/dashboard/Sidebar';
import axios from '../../api/axios';

// Helper functions
const formatName = (name) => {
  if (!name) return '';
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const getAvatarColor = (name) => {
  if (!name) return '#6366F1';
  const first = name.charAt(0).toLowerCase();
  if ('abc'.includes(first)) return '#FF7A00';
  if ('def'.includes(first)) return '#8B5CF6';
  if ('ghi'.includes(first)) return '#3B82F6';
  if ('jkl'.includes(first)) return '#10B981';
  if ('mno'.includes(first)) return '#F59E0B';
  if ('pqr'.includes(first)) return '#EF4444';
  if ('stu'.includes(first)) return '#06B6D4';
  if ('vwx'.includes(first)) return '#EC4899';
  return '#6366F1';
};

const SIDEBAR_W = 224;

export default function DSAPractice() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('az');

  // Fetch with react-query
  const { data: companies = [], isLoading, isError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => axios.get('/api/companies').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Filter + Sort logic
  const filtered = companies
    .filter(c => 
      formatName(c)
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'az') 
        return a.localeCompare(b);
      if (sort === 'za') 
        return b.localeCompare(a);
      return 0;
    });

  return (
    <div className="flex min-h-screen bg-[#07070F]" style={{ background: 'var(--bg-primary,#07070F)' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        className="flex-1 flex flex-col min-w-0"
        style={{ marginLeft: SIDEBAR_W }}
      >
        {/* HEADER (sticky top-0, blur, border-bottom) */}
        <header
          className="sticky top-0 z-30 shrink-0 px-6 py-4 flex items-center justify-between border-b select-none"
          style={{
            background: 'rgba(7,7,15,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottomColor: 'var(--border, rgba(255,255,255,0.06))'
          }}
        >
          <div className="flex items-center gap-2">
            <Code2 size={20} className="text-[#FF7A00]" />
            <h1 className="text-xl font-bold text-white">Company Questions</h1>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full select-none"
            style={{
              background: 'var(--bg-hover, #141428)',
              color: 'var(--text-3, #475569)',
              border: '1px solid var(--border, rgba(255,255,255,0.06))'
            }}
          >
            {companies.length} companies
          </span>
        </header>

        {/* SEARCH + SORT BAR (px-6 py-4) */}
        <div className="px-6 py-4 flex gap-3 items-center select-none">
          {/* Search input (flex-1) */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full pl-10 py-2.5 pr-4 rounded-xl text-sm outline-none transition-colors border text-white"
              style={{
                background: 'var(--bg-card, #0F0F1A)',
                borderColor: 'var(--border, rgba(255,255,255,0.06))',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(249,115,22,0.4)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border, rgba(255,255,255,0.06))'; }}
            />
          </div>

          {/* Sort pills (flex gap-2) */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setSort('az')}
              className={`cursor-pointer px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                sort === 'az'
                  ? 'text-black'
                  : 'text-gray-400 border'
              }`}
              style={{
                background: sort === 'az' ? '#FF7A00' : 'var(--bg-card, #0F0F1A)',
                borderColor: sort === 'az' ? 'transparent' : 'var(--border, rgba(255,255,255,0.06))'
              }}
            >
              A-Z
            </button>
            <button
              onClick={() => setSort('za')}
              className={`cursor-pointer px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                sort === 'za'
                  ? 'text-black'
                  : 'text-gray-400 border'
              }`}
              style={{
                background: sort === 'za' ? '#FF7A00' : 'var(--bg-card, #0F0F1A)',
                borderColor: sort === 'za' ? 'transparent' : 'var(--border, rgba(255,255,255,0.06))'
              }}
            >
              Z-A
            </button>
          </div>
        </div>

        {/* COMPANIES GRID (px-6 pb-8) */}
        <div className="px-6 pb-8 flex-1 overflow-y-auto">
          {/* LOADING STATE */}
          {isLoading && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse p-5 border"
                  style={{
                    background: 'var(--bg-card, #0F0F1A)',
                    borderColor: 'var(--border, rgba(255,255,255,0.06))',
                    borderRadius: '12px'
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl"
                    style={{ background: 'var(--bg-hover, #141428)' }}
                  />
                  <div
                    className="h-3 rounded mt-3"
                    style={{ background: 'var(--bg-hover, #141428)' }}
                  />
                  <div
                    className="h-2 rounded mt-2 w-2/3"
                    style={{ background: 'var(--bg-hover, #141428)' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && isError && (
            <div className="flex items-center justify-center py-20 text-center">
              <span className="text-red-400 text-sm font-semibold">Failed to load companies</span>
            </div>
          )}

          {/* EMPTY SEARCH STATE */}
          {!isLoading && !isError && filtered.length === 0 && search.trim() !== '' && (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none">
              <Search size={40} className="text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm font-medium">
                No companies found for '{search}'
              </p>
            </div>
          )}

          {/* COMPANY CARDS */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((company, index) => {
                const color = getAvatarColor(company);
                const displayNameStr = formatName(company);

                return (
                  <motion.div
                    key={company}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, ease: 'easeOut' }}
                    whileHover={{
                      y: -3,
                      boxShadow: '0 8px 24px rgba(249,115,22,0.1)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/company/${company}`)}
                    className="group border cursor-pointer select-none transition-all duration-200"
                    style={{
                      background: 'var(--bg-card, #0F0F1A)',
                      borderColor: 'var(--border, rgba(255,255,255,0.06))',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.06))'; }}
                  >
                    {/* Avatar circle */}
                    <div
                      className="w-10 h-10 flex items-center justify-center font-bold text-lg select-none"
                      style={{
                        borderRadius: '10px',
                        background: `${color}20`,
                        border: `1px solid ${color}40`,
                        color: color
                      }}
                    >
                      {displayNameStr.charAt(0)}
                    </div>

                    {/* Company name */}
                    <h3 className="mt-3 font-semibold text-sm text-white">
                      {displayNameStr}
                    </h3>

                    {/* Practice → text */}
                    <p className="mt-1 text-xs text-gray-500 transition-colors duration-150 group-hover:text-orange-400">
                      Practice &rarr;
                    </p>
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
