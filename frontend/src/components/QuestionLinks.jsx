import React, { useState, useEffect } from 'react';
import { FaExternalLinkAlt as ExternalLink, FaSpinner as Loader2 } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast component to render success or error alerts dynamically.
 */
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const isSuccess = type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl text-sm font-semibold shadow-2xl flex items-center gap-2 border"
      style={{
        background: 'var(--bg-card, #0F0F1A)',
        borderColor: isSuccess ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        color: isSuccess ? '#4ADE80' : '#F87171',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <span>{isSuccess ? '✅' : '❌'}</span>
      <span>{message}</span>
    </motion.div>
  );
}

/**
 * QuestionLinks component that displays the primary practice link for LeetCode questions
 * and a "Mark Solved" button to submit/sync solution progress to GitHub.
 *
 * @param {Object} props
 * @param {Object} props.question - The question document
 * @param {string} [props.company] - Optional company name for submission context
 */
export default function QuestionLinks({ question, company }) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  if (!question) return null;

  const leetcodeLink = question.leetcodeUrl || '';

  // Check if the question is already solved
  const isSolved = user?.solvedQuestions?.some(
    (sq) => sq.questionId === question._id
  );

  const handleMarkSolved = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setToast(null);

    try {
      const response = await apiClient.post('/api/submissions/solve', {
        questionId: question._id,
        language: 'javascript',
        code: `// Solution for ${question.title} solved on CodePrep\n`,
        company: company || null,
      });

      if (response.data.success) {
        setToast({ message: 'Question synced to Github', type: 'success' });
        
        // Fetch the updated user profile to sync solvedQuestions and stats
        const profileRes = await apiClient.get('/api/auth/me');
        dispatch(setUser(profileRes.data));
      } else {
        setToast({ message: 'Failed to sync solution to GitHub', type: 'error' });
      }
    } catch (err) {
      console.error('Error marking question as solved:', err);
      setToast({ message: 'Failed to sync solution to GitHub', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none mx-auto min-w-[180px] max-w-[220px] w-full">
      <div
        className="border p-3 w-full flex flex-col gap-2 items-center justify-center"
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

        {isAuthenticated && (
          <button
            onClick={handleMarkSolved}
            disabled={isLoading}
            className={`cursor-pointer w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-85 shadow-md ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              background: isSolved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              border: isSolved ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isSolved ? '#4ADE80' : '#E2E8F0'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={11} className="animate-spin text-white" />
                <span>Syncing...</span>
              </>
            ) : isSolved ? (
              <span>Solved</span>
            ) : (
              <span>Mark Solved</span>
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

