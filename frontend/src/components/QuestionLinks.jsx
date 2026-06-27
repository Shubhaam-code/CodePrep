import React, { useState, useEffect } from 'react';
import { FaExternalLinkAlt as ExternalLink, FaSpinner as Loader2 } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Compute a sync context key from the current page context.
 * Must match the getSyncContext() logic used in the extension.
 */
export function getSyncContext({ company, challenge, day, pattern, sheet } = {}) {
  if (challenge === 'gv' && day !== undefined && day !== null) {
    return `gv_day${day}`;
  }
  if (company) return `company_${company}`;
  if (pattern) return `pattern_${pattern}`;
  if (sheet)   return `sheet_${sheet}`;
  return 'general';
}

/**
 * Returns true if the given question has a solved record for the user
 * under the given syncContext. Handles both populated (`{ questionId: { _id } }`)
 * and raw-id (`{ questionId: '...' }`) shapes, so it works for both the
 * freshly-fetched /api/auth/me response and a localStorage-cached user.
 */
export function isQuestionSolvedInContext(user, questionId, syncContext) {
  if (!user || !user.solvedQuestions || !questionId) return false;
  const target = syncContext || 'general';
  return user.solvedQuestions.some((sq) => {
    const sqId =
      typeof sq.questionId === 'object' && sq.questionId !== null
        ? sq.questionId._id
        : sq.questionId;
    if (!sqId) return false;
    return (
      sqId.toString() === questionId.toString() &&
      (sq.syncContext || 'general') === target
    );
  });
}



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
 * and a context-aware "Mark Solved" button that tracks solved state per syncContext.
 *
 * @param {Object} props
 * @param {Object} props.question    - The question document
 * @param {string} [props.company]   - Company context (e.g. "google", "adobe")
 * @param {string} [props.challenge] - Challenge type (e.g. "gv")
 * @param {number} [props.day]       - Day number (used with challenge="gv")
 * @param {string} [props.pattern]   - DSA pattern context
 * @param {string} [props.sheet]     - Sheet context
 */
export default function QuestionLinks({ question, company, challenge, day, pattern, sheet }) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Compute the current sync context from the provided props
  const syncContext = getSyncContext({ company, challenge, day, pattern, sheet });
  console.log("USER:", user);
console.log(
  "SOLVED QUESTIONS:",
  JSON.stringify(user?.solvedQuestions, null, 2)
);
console.log("CURRENT SYNC CONTEXT:", syncContext);



  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  if (!question) return null;

  const leetcodeLink = question.leetcodeUrl || '';

  const isSolved = isQuestionSolvedInContext(user, question._id, syncContext);

  const handleOpenProblem = () => {
    if (!leetcodeLink) return;
    const separator = leetcodeLink.includes('?') ? '&' : '?';

    // Build URL params matching the syncContext
    const params = new URLSearchParams();
    if (company)   params.set('company', company);
    if (challenge) params.set('challenge', challenge);
    if (day !== undefined && day !== null) params.set('day', String(day));
    if (pattern)   params.set('pattern', pattern);
    if (sheet)     params.set('sheet', sheet);

    const queryString = params.toString();
    const targetUrl = queryString
      ? `${leetcodeLink}${separator}${queryString}`
      : leetcodeLink;

    window.open(targetUrl, '_blank');
  };

  const handleMarkSolved = async () => {
    if (isLoading || isSolved) return;
    setIsLoading(true);
    setToast(null);

    try {
      const response = await apiClient.post('/api/submissions/solve', {
        questionId: question._id,
        language: 'javascript',
        code: `// Solution for ${question.title} solved on CodePrep\n`,
        company: company || null,
        challenge: challenge || null,
        day: day !== undefined && day !== null ? Number(day) : null,
        pattern: pattern || null,
        sheet: sheet || null,
        syncContext,
      });

      if (response.data.success) {
        const message = response.data.githubSynced
          ? 'Question synced to GitHub'
          : response.data.githubSyncError
          ? `Saved locally. ${response.data.githubSyncError}`
          : 'Question saved locally';
        setToast({
          message,
          type: response.data.githubSyncError ? 'error' : 'success',
        });

        // Refresh global user profile so solvedQuestions / streak stats stay accurate
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
            onClick={handleOpenProblem}
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
            disabled={isLoading || isSolved}
            title={isSolved ? `Already solved in context: ${syncContext}` : 'Mark as solved'}
            className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-85 shadow-md ${
              isSolved
                ? 'cursor-not-allowed opacity-80'
                : isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
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
              <span>✓ Solved</span>
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
