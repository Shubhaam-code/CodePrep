import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Home, LayoutDashboard } from 'lucide-react';
import { useAppDispatch } from '../../store/store';
import { updateSolvedQuestions } from '../../store/authSlice';
import apiClient from '../../api/axios';
import MonacoEditorWorkspace from '../../components/shared/MonacoEditorWorkspace';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

export default function PracticeWorkspace() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/api/questions/${questionId}`);
        setQuestion(res.data);
      } catch (err) {
        console.error('Error fetching question:', err);
        setError('Failed to load coding challenge details.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [questionId]);

  const handleRun = async (code, language, customInput) => {
    try {
      setRunning(true);
      setResults(null);
      const res = await apiClient.post('/api/judge/run', {
        code,
        language,
        questionId,
        input: customInput
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      setResults({
        status: 'Compilation Error',
        error: err.response?.data?.message || 'Failed to connect to execution server.'
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async (code, language) => {
    try {
      setSubmitting(true);
      setResults(null);
      const res = await apiClient.post('/api/judge/submit', {
        code,
        language,
        questionId
      });
      setResults(res.data);

      if (res.data.status === 'Accepted') {
        // Record solve on user account in database & Redux
        const solveRes = await apiClient.post(`/api/user/solve/${questionId}`);
        dispatch(updateSolvedQuestions(solveRes.data));
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error(err);
      setResults({
        status: 'Compilation Error',
        error: err.response?.data?.message || 'Submission failed.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col">
      {/* Workspace Header */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#0D0D12] select-none">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors border border-white/5 px-3 py-1.5 rounded-xl bg-white/[0.01]"
          >
            <ArrowLeft size={12} /> Back
          </button>
          
          <div className="h-4 w-px bg-white/10" />

          <div>
            <h2 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Practice Challenge</h2>
            <h1 className="text-sm font-black text-white">{question?.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to="/dashboard" 
            className="text-xs font-semibold text-gray-400 hover:text-[#FF7A00] flex items-center gap-1.5 transition-colors border border-white/5 px-3 py-1.5 rounded-xl bg-white/[0.01]"
          >
            <LayoutDashboard size={13} /> Dashboard
          </Link>
        </div>
      </header>

      {/* Workspace Area */}
      <MonacoEditorWorkspace
        question={question}
        onRun={handleRun}
        onSubmit={handleSubmit}
        running={running}
        submitting={submitting}
        results={results}
      />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="bg-[#0D0D12] border border-green-500/20 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-400">
              <CheckCircle size={32} className="animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Challenge Solved!</h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                Congratulations! Your solution passed all visible and hidden assertions successfully.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Keep Coding
              </button>
              <button 
                onClick={() => navigate('/dashboard/dsa')}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Back to Topics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
