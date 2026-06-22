import React from 'react';

/**
 * QuestionLinks component that displays practice links for LeetCode questions.
 * For free questions, it displays a standard LeetCode button.
 * For premium questions, it displays a premium badge, a disabled LeetCode button,
 * and free alternative links (GFG, NeetCode, YouTube, Google Search).
 *
 * @param {Object} props
 * @param {Object} props.question - The question document
 */
export default function QuestionLinks({ question }) {
  if (!question) return null;

  const isPremium = !!question.isPremium;
  const title = question.title || '';

  // Generate alternative links from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const gfgUrl = `https://www.geeksforgeeks.org/problems/${slug}`;
  const neetcodeUrl = `https://neetcode.io/problems/${slug}`;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' leetcode solution')}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(title + ' leetcode solution site:geeksforgeeks.org OR site:neetcode.io')}`;

  // If NOT premium, show only LeetCode button (orange)
  if (!isPremium) {
    return (
      <div className="flex items-center justify-center">
        {question.leetcodeUrl ? (
          <a
            href={question.leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF7A00] hover:bg-[#FF8C1A] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#FF7A00]/10 hover:shadow-[#FF7A00]/20"
            title="Open in LeetCode"
          >
            <span>LeetCode</span>
            <span className="text-[10px]">↗</span>
          </a>
        ) : (
          <span className="text-slate-700 font-medium">-</span>
        )}
      </div>
    );
  }

  // If IS premium, show badge, warning, and alternative buttons
  return (
    <div className="flex flex-col gap-1.5 py-1 text-left min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/25 uppercase tracking-wider">
          🔒 Premium
        </span>
      </div>
      <p className="text-[10px] text-gray-500 font-medium leading-tight max-w-[250px]">
        LeetCode Premium required. Try these free alternatives:
      </p>
      <div className="flex flex-col sm:flex-row flex-wrap gap-1.5">
        {/* LeetCode Premium - Disabled look */}
        <span 
          className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-slate-900/60 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-800/80 cursor-not-allowed select-none"
          title="Premium Question"
        >
          🔒 LeetCode Premium
        </span>
        {/* GFG */}
        <a
          href={gfgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-[10px] font-bold rounded-lg transition-all border border-emerald-500/20 hover:border-emerald-500/40"
        >
          GFG 📖
        </a>
        {/* NeetCode */}
        <a
          href={neetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-lg transition-all border border-blue-500/20 hover:border-blue-500/40"
        >
          NeetCode 💡
        </a>
        {/* YouTube */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-[10px] font-bold rounded-lg transition-all border border-rose-500/20 hover:border-rose-500/40"
        >
          YouTube ▶️
        </a>
        {/* Google */}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-bold rounded-lg transition-all border border-white/10 hover:border-white/20"
        >
          Google 🔍
        </a>
      </div>
    </div>
  );
}
