import React, { useEffect, useState } from 'react';
import apiClient from '../../api/axios';

/**
 * QuestionContent component that fetches full question HTML content
 * from the backend cache/Alfa API and renders it safely with styling.
 */
export default function QuestionContent({ leetcodeId, title }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!leetcodeId) return;

    const fetchQuestionDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/exam/question/${leetcodeId}`);
        if (isMounted) {
          setData(response.data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching question content:', err);
          setError(err.response?.data?.message || 'Failed to load question details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchQuestionDetails();

    return () => {
      isMounted = false;
    };
  }, [leetcodeId]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse py-2">
        <div className="h-6 bg-white/5 rounded-lg w-3/4" />
        <div className="space-y-2 pt-4">
          <div className="h-4 bg-white/5 rounded-lg w-full" />
          <div className="h-4 bg-white/5 rounded-lg w-full" />
          <div className="h-4 bg-white/5 rounded-lg w-5/6" />
        </div>
        <div className="h-28 bg-[#111115] border border-white/5 rounded-xl mt-6" />
        <div className="space-y-2 pt-4">
          <div className="h-4 bg-white/5 rounded-lg w-full" />
          <div className="h-4 bg-white/5 rounded-lg w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-950/20 border border-red-950 text-red-400 text-xs rounded-xl text-center">
        <p className="font-bold mb-1">Failed to Load Content</p>
        <p className="opacity-80">{error}</p>
        {data?.leetcodeUrl && (
          <a
            href={data.leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 px-3 py-1.5 bg-red-950/40 text-red-200 rounded-lg hover:bg-red-900/30 transition-colors"
          >
            Practice directly on LeetCode →
          </a>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Dynamic styles injected specifically for LeetCode HTML content styling */}
      <style>{`
        .leetcode-html pre {
          background-color: #0E0E12;
          padding: 1rem;
          border-radius: 0.75rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.85em;
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.04);
          margin: 1rem 0;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .leetcode-html code {
          background-color: rgba(255, 255, 255, 0.05);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.85em;
          color: #E2E8F0;
        }
        .leetcode-html pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
          color: inherit;
        }
        .leetcode-html strong {
          color: #FF7A00;
          font-weight: 700;
        }
        .leetcode-html ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
          display: block;
        }
        .leetcode-html ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
          display: block;
        }
        .leetcode-html li {
          margin-bottom: 0.35rem;
          display: list-item;
        }
        .leetcode-html p {
          margin: 0.75rem 0;
          line-height: 1.625;
        }
        .leetcode-html hr {
          border-color: rgba(255, 255, 255, 0.05);
          margin: 1.5rem 0;
        }
      `}</style>

      {/* HTML Render */}
      <div 
        className="leetcode-html text-sm text-gray-300 leading-relaxed font-sans"
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      {/* Hints (Handled by MockExam component but cached here) */}
      {data.hints && data.hints.length > 0 && (
        <div className="hidden-hints-data hidden" data-hints={JSON.stringify(data.hints)} />
      )}
      {data.exampleTestcases && (
        <div className="hidden-testcases-data hidden" data-testcases={data.exampleTestcases} />
      )}
    </div>
  );
}
