import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import {
  FaGithub,
  FaArrowRight,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaPuzzlePiece,
  FaRocket,
  FaCheck
} from 'react-icons/fa';

export default function Onboarding() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [step, setStep] = useState(1);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Extension Handshake: Poll every 2 seconds for presence of companion extension
  useEffect(() => {
    let handshakeInterval;
    
    const handlePongMessage = (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'CODEPREP_PONG') {
        console.log('[Onboarding] Companion Extension PONG received.');
        setExtensionConnected(true);
      }
    };

    window.addEventListener('message', handlePongMessage);

    // Initial ping
    window.postMessage({ type: 'CODEPREP_PING' }, '*');

    // Polling ping
    handshakeInterval = setInterval(() => {
      if (!extensionConnected) {
        console.log('[Onboarding] Pinging Companion Extension...');
        window.postMessage({ type: 'CODEPREP_PING' }, '*');
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handlePongMessage);
      clearInterval(handshakeInterval);
    };
  }, [extensionConnected]);

  // 2. Listen for mock OAuth success messages from GitHub popup window
  useEffect(() => {
    const handleOAuthMessage = async (event) => {
      if (event.data?.type === 'oauth-success' && event.data?.provider === 'github') {
        try {
          console.log('[Onboarding] GitHub OAuth succeeded. Syncing user profile details...');
          const profileRes = await apiClient.get('/api/auth/me');
          dispatch(setUser(profileRes.data));
        } catch (err) {
          console.error('[Onboarding] Failed to sync profile details:', err);
          setErrorMsg('Failed to sync profile details after connection.');
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [dispatch]);

  const handleConnectGitHub = () => {
    setErrorMsg('');
    const baseUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');
    const connectUrl = `${baseUrl}/api/auth/github?token=${token}`;
    window.open(connectUrl, 'GitHub Connect', 'width=600,height=600');
  };

  const handleSkip = () => {
    console.log('[Onboarding] User chose to skip onboarding process.');
    sessionStorage.setItem('onboarding_skipped', 'true');
    navigate('/dashboard');
  };

  const handleCompleteOnboarding = async () => {
    setIsCompleting(true);
    setErrorMsg('');
    try {
      console.log('[Onboarding] Sending request to complete onboarding workflow...');
      const response = await apiClient.post('/api/auth/onboarding/complete');
      if (response.data?.success) {
        console.log('[Onboarding] Onboarding completion response success. Dispatching updated user profile.');
        dispatch(setUser(response.data.user));
        navigate('/dashboard');
      } else {
        throw new Error('Onboarding completion request rejected by server.');
      }
    } catch (err) {
      console.error('[Onboarding] Error during complete request execution:', err);
      setErrorMsg(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const githubConnected = user?.githubConnected || false;

  // Stepper state configurations
  const stepsConfig = [
    { title: 'Welcome', number: 1 },
    { title: 'GitHub', number: 2 },
    { title: 'Extension', number: 3 },
    { title: 'Ready', number: 4 }
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic blurred glowing backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF7A00]/2 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFB800]/2.5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Top Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FFB800] flex items-center justify-center text-black font-extrabold text-sm shadow-md shadow-[#FF7A00]/20">CP</div>
          <span className="text-white font-extrabold text-lg tracking-wider">CodePrep</span>
        </div>
        <button
          onClick={handleSkip}
          className="cursor-pointer text-xs font-bold text-gray-500 hover:text-gray-300 transition px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02]"
        >
          Skip For Now
        </button>
      </div>

      {/* Onboarding Wizard Card */}
      <div className="w-full max-w-2xl bg-[#0D0D12]/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl relative z-10">
        
        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          {stepsConfig.map((s, idx) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                    step >= s.number
                      ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black border-transparent shadow shadow-[#FF7A00]/10'
                      : 'border-white/20 text-gray-500 bg-[#0B0B0F]'
                  }`}
                >
                  {step > s.number ? <FaCheck size={8} /> : s.number}
                </div>
                <span
                  className={`text-xs font-bold transition ${
                    step >= s.number ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < stepsConfig.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-4 transition-all duration-300 ${
                    step > s.number ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800]' : 'bg-white/5'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {errorMsg && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3.5 text-xs text-red-400 text-center flex items-center justify-center gap-2">
            <FaExclamationCircle /> {errorMsg}
          </div>
        )}

        {/* Wizard step views wrapper */}
        <div className="min-h-[220px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Welcome Screen */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    Welcome to CodePrep! <span className="animate-pulse">⚡</span>
                  </h2>
                  <p className="text-gray-400 text-sm">
                    CodePrep helps you structure company-wise interview practice and build a stunning GitHub portfolio automatically. Let's configure your workspace in a few simple steps.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl space-y-2">
                    <div className="text-xl">🎯</div>
                    <h3 className="text-white font-bold text-xs">Targeted Preparation</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Filter questions by target tech company and match real exam frequencies.</p>
                  </div>
                  <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl space-y-2">
                    <div className="text-xl">📂</div>
                    <h3 className="text-white font-bold text-xs">Portfolio Sync</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Save submissions and push structured folders automatically to your GitHub.</p>
                  </div>
                  <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl space-y-2">
                    <div className="text-xl">🔄</div>
                    <h3 className="text-white font-bold text-xs">Auto LeetCode Sync</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Write code on LeetCode; companion extension syncs detail in the background.</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF7A00]/10 transition"
                  >
                    Get Started <FaArrowRight size={10} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Connect GitHub */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    Connect GitHub <FaGithub size={22} className="text-[#FF7A00]" />
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Allow CodePrep to initialize your portfolio repository (`company-preparation`) and upload your solutions automatically.
                  </p>
                </div>

                <div className="bg-[#0B0B0F] border border-white/5 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                      <FaGithub size={18} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xs">
                        {githubConnected ? user.githubUsername : 'GitHub disconnected'}
                      </h3>
                      <p className="text-gray-500 text-[10px] mt-0.5">
                        {githubConnected ? 'OAuth Connection Active' : 'Setup required to push solutions'}
                      </p>
                    </div>
                  </div>

                  {githubConnected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      <FaCheckCircle size={10} /> Connected
                    </span>
                  ) : (
                    <button
                      onClick={handleConnectGitHub}
                      className="cursor-pointer px-4 py-2 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 font-extrabold text-xs text-black rounded-xl transition shadow"
                    >
                      Connect GitHub
                    </button>
                  )}
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!githubConnected}
                    className={`cursor-pointer px-5 py-2.5 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 transition ${
                      githubConnected
                        ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 shadow-lg shadow-[#FF7A00]/10'
                        : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    Continue <FaArrowRight size={10} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Install Chrome Extension */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    Install Companion Extension <FaPuzzlePiece size={22} className="text-[#FF7A00]" />
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Install our extension to capture code solutions and submission state directly on LeetCode pages.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Instructions */}
                  <div className="bg-[#0B0B0F] border border-white/5 p-5 rounded-2xl space-y-3">
                    <h3 className="text-white font-bold text-xs border-b border-white/5 pb-2">How to install:</h3>
                    <ol className="text-[10px] text-gray-500 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Download the extension directory source.</li>
                      <li>Open <code className="text-gray-300 font-mono text-[9px] bg-white/5 px-1 py-0.5 rounded">chrome://extensions</code> in browser.</li>
                      <li>Enable <strong>Developer Mode</strong> (top right).</li>
                      <li>Click <strong>Load Unpacked</strong> and select the directory folder.</li>
                    </ol>
                  </div>

                  {/* Status Box */}
                  <div className="bg-[#0B0B0F] border border-white/5 p-5 rounded-2xl flex flex-col justify-between items-center text-center space-y-3">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Connection Status</span>
                    
                    {extensionConnected ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          <FaCheckCircle size={12} /> Connected
                        </span>
                        <p className="text-[9px] text-gray-500 mt-1.5">Extension handshake established successfully</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                          <FaSpinner className="animate-spin" size={10} /> Waiting...
                        </span>
                        <p className="text-[9px] text-gray-500">Pinging extension for handshake</p>
                      </div>
                    )}
                    
                    <div />
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={!extensionConnected}
                    className={`cursor-pointer px-5 py-2.5 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 transition ${
                      extensionConnected
                        ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 shadow-lg shadow-[#FF7A00]/10'
                        : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    Continue <FaArrowRight size={10} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Success / Start Preparing */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    Setup Complete! <FaRocket size={22} className="text-[#FF7A00]" />
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Everything is configured. You are fully ready to start solving company questions and sync progress.
                  </p>
                </div>

                <div className="bg-[#0B0B0F] border border-white/5 p-6 rounded-2xl space-y-4">
                  <h3 className="text-white font-bold text-xs border-b border-white/5 pb-2.5 flex items-center gap-1.5">
                    ⚙ Workspace Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">GitHub Connection</span>
                      {githubConnected ? (
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <FaCheckCircle size={10} /> Connected
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <FaExclamationCircle size={10} /> Incomplete
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Companion Chrome Extension</span>
                      {extensionConnected ? (
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <FaCheckCircle size={10} /> Connected
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <FaExclamationCircle size={10} /> Incomplete
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(!githubConnected || !extensionConnected) && (
                  <div className="bg-amber-950/10 border border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-400 text-center flex items-center justify-center gap-2">
                    ⚠️ Complete connection setup to enable automatic LeetCode sync.
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center">
                  <button
                    onClick={() => setStep(3)}
                    className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 transition"
                  >
                    Back
                  </button>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleSkip}
                      className="cursor-pointer px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition"
                    >
                      Browse Companies
                    </button>
                    <button
                      onClick={handleCompleteOnboarding}
                      disabled={isCompleting || !githubConnected || !extensionConnected}
                      className={`cursor-pointer px-5 py-2.5 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 transition ${
                        !isCompleting && githubConnected && extensionConnected
                          ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 shadow-lg shadow-[#FF7A00]/10'
                          : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {isCompleting ? (
                        <>
                          <FaSpinner className="animate-spin" size={10} /> Completing...
                        </>
                      ) : (
                        'Start Preparing'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
