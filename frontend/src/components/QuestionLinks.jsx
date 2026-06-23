import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * QuestionLinks component that displays the primary practice link for LeetCode questions.
 * Displays the actual LeetCode URL from the database and a prominent button to open it.
 *
 * @param {Object} props
 * @param {Object} props.question - The question document
 */
export default function QuestionLinks({ question }) {
  if (!question) return null;

  const leetcodeLink = question.leetcodeUrl || '';

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none mx-auto min-w-[180px] max-w-[220px] w-full">
      <div
        className="border p-3 w-full flex items-center justify-center"
        style={{
          background: 'rgba(15,15,26,0.6)',
          borderColor: 'var(--border, rgba(255,255,255,0.06))',
          borderRadius: '12px'
        }}
      >
        {leetcodeLink ? (
          <button
            onClick={() => window.open(leetcodeLink, '_blank')}
            className="cursor-pointer w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-85 shadow-md shadow-[#FF7A00]/15"
            style={{ background: '#FF7A00' }}
          >
            <span>Open Problem</span>
            <ExternalLink size={11} />
          </button>
        ) : (
          <button
            disabled
            className="cursor-not-allowed w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-500 transition-all border border-slate-800"
            style={{ background: 'rgba(15, 15, 26, 0.4)' }}
          >
            <span>Problem Link Unavailable</span>
          </button>
        )}
      </div>
    </div>
  );
}
