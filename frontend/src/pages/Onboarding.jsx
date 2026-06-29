import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import { openGitHubOAuthPopup } from '../utils/githubOAuth';
import {
  FaGithub,
  FaArrowRight,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaRocket,
  FaCheck,
  FaDownload,
  FaRedo,
  FaCopy,
  FaChevronDown,
  FaChevronUp,
  FaQuestionCircle
} from 'react-icons/fa';

export default function Onboarding() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);

  const savedStep = sessionStorage.getItem('onboarding_step');
  const [step, setStepState] = useState(savedStep ? Number(savedStep) : 1);
  const stepRef = useRef(savedStep ? Number(savedStep) : 1);

  const setStep = (val) => {
    if (typeof val === 'function') {
      setStepState((prev) => {
        const next = val(prev);
        stepRef.current = next;
        sessionStorage.setItem('onboarding_step', next);
        return next;
      });
    } else {
      stepRef.current = val;
      setStepState(val);
      sessionStorage.setItem('onboarding_step', val);
    }
  };

  const [detectionState, setDetectionStateState] = useState('idle');
  const detectionStateRef = useRef('idle');
  const setDetectionState = (val) => {
    detectionStateRef.current = val;
    setDetectionStateState(val);
  };
  const extensionConnected = detectionState === 'success';

  const [isCompleting, setIsCompleting] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Refs for tracking the background polling interval and start time
  const pollingIntervalRef = useRef(null);
  const pollingStartTimeRef = useRef(0);
  const checkPendingTimerRef = useRef(null); // Ref to track the 1-second timeout after a page refresh check

  /**
   * Restarts the silent background polling loop.
   * Clears any active interval, resets the timer, and sets a 2-second check interval.
   */
  const restartPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    pollingStartTimeRef.current = Date.now();
    const maxDuration = 5 * 60 * 1000; // 5 minutes cap

    const checkPresence = () => {
      const isInstalled = document.documentElement.getAttribute("data-extension-installed") === "true";
      if (isInstalled) {
        setDetectionState('success');
        localStorage.setItem('extension_installed_once', 'true');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return true;
      }
      return false;
    };

    pollingIntervalRef.current = setInterval(() => {
      if (Date.now() - pollingStartTimeRef.current > maxDuration) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      checkPresence();
    }, 2000);
  };

  // ── Instant Extension Detection ──────────────────────────────────────
  const handleInstalledClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 1. Set the pending check flag in localStorage before refreshing
    localStorage.setItem('extensionCheckPending', 'true');

    // 2. Perform page reload to ensure browser injects the extension content script
    window.location.reload();
  };

  // Check extension presence automatically when user enters step 3
  useEffect(() => {
    if (step === 3 && detectionStateRef.current !== 'success') {
      const isPending = localStorage.getItem('extensionCheckPending') === 'true';

      if (isPending) {
        // Clear the flag immediately to prevent repeat detection on manual refreshes
        localStorage.removeItem('extensionCheckPending');
        setDetectionState('checking');

        // Allow 1.5 seconds for the extension content script to inject and load in the DOM
        checkPendingTimerRef.current = setTimeout(() => {
          const isInstalled = document.documentElement.getAttribute("data-extension-installed") === "true";
          if (isInstalled) {
            setDetectionState('success');
            localStorage.setItem('extension_installed_once', 'true');
            setErrorMsg('');
            setDownloadError('');
          } else {
            setDetectionState('failure');
            restartPolling();
          }
        }, 1500);
      } else {
        const isInstalled = document.documentElement.getAttribute("data-extension-installed") === "true";
        if (isInstalled) {
          setDetectionState('success');
          localStorage.setItem('extension_installed_once', 'true');
        } else {
          setDetectionState('idle');
          restartPolling();
        }
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (checkPendingTimerRef.current) {
        clearTimeout(checkPendingTimerRef.current);
        checkPendingTimerRef.current = null;
      }
    };
  }, [step]);

  const handleConnectGitHub = () => {
    setErrorMsg('');
    setIsConnectingGithub(true);
    openGitHubOAuthPopup({
      dispatch,
      queryClient,
      onSuccess: () => {
        setIsConnectingGithub(false);
        setStep(3);
      },
      onError: (message) => {
        setIsConnectingGithub(false);
        setErrorMsg(message);
      },
      onClosed: () => {
        setIsConnectingGithub(false);
        setErrorMsg('GitHub connection was cancelled before authorization completed.');
      },
    });
  };

  const handleSkip = () => {
    console.log('[Onboarding] User chose to skip onboarding process.');
    sessionStorage.setItem('onboarding_skipped', 'true');
    sessionStorage.removeItem('onboarding_step');
    navigate('/dashboard');
  };


  const faqItems = [
    { q: 'Is this safe?', a: 'The extension only works on LeetCode and your website. It never reads unrelated websites.' },
    { q: 'Do I need to install this every time?', a: 'No. Only once.' },
    { q: 'Why is this required?', a: 'It automatically tracks accepted solutions and syncs them with your account.' },
    { q: 'Can I uninstall later?', a: 'Yes. Tracking will simply stop until you reinstall.' },
  ];

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadExtension = async (e) => {
    setDownloadError('');
    try {
      const res = await fetch('/downloads/leetcode-companion-extension.zip', { method: 'HEAD' });
      if (!res.ok) {
        e.preventDefault();
        setDownloadError('Extension package is temporarily unavailable.');
        setTimeout(() => setDownloadError(''), 4000);
      }
    } catch {
      e.preventDefault();
      setDownloadError('Extension package is temporarily unavailable.');
      setTimeout(() => setDownloadError(''), 4000);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsCompleting(true);
    setErrorMsg('');
    try {
      console.log('[Onboarding] Sending request to complete onboarding workflow...');
      const response = await apiClient.post('/api/auth/onboarding/complete');
      if (response.data?.success) {
        console.log('[Onboarding] Onboarding completion response success. Dispatching updated user profile.');
        sessionStorage.removeItem('onboarding_step');
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
  const githubProfileUrl = user?.githubProfileUrl || (user?.githubUsername ? `https://github.com/${user.githubUsername}` : '');



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
      <div className="w-full max-w-2xl flex justify-center mt-6 mb-12 z-10">
        <img
          src="/imagecopy.png"
          alt="CodePrep AI"
          className="h-24 sm:h-32 md:h-40 w-auto object-contain drop-shadow-[0_0_24px_rgba(255,122,0,0.22)]"
        />
      </div>

      {/* Onboarding Wizard Card */}
      <div className="w-full max-w-2xl bg-[#0D0D12]/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl relative z-10">

        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          {stepsConfig.map((s, idx) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${step >= s.number
                      ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black border-transparent shadow shadow-[#FF7A00]/10'
                      : 'border-white/20 text-gray-500 bg-[#0B0B0F]'
                    }`}
                >
                  {step > s.number ? <FaCheck size={8} /> : s.number}
                </div>
                <span
                  className={`text-xs font-bold transition ${step >= s.number ? 'text-white' : 'text-gray-500'
                    }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < stepsConfig.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-4 transition-all duration-300 ${step > s.number ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800]' : 'bg-white/5'
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

        {downloadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-950/20 border border-red-900/50 rounded-xl p-3.5 text-xs text-red-400 text-center flex items-center justify-center gap-2"
          >
            <FaExclamationCircle /> {downloadError}
          </motion.div>
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
                    Welcome to CodePrep!
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Your all-in-one coding workspace. Practice company interview questions, learn DSA through structured pattern roadmaps, and complete the G. Viswanathan Challenge. Accepted solutions are automatically organized into GitHub repositories — building a clean portfolio without manual work.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl space-y-2">
                    <div className="text-xl">📚</div>
                    <h3 className="text-white font-bold text-xs">Structured Learning</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Practice Company questions, DSA Pattern Roadmaps, and the GV Challenge — all in one place.</p>
                  </div>
                  <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl space-y-2">
                    <div className="text-xl">📂</div>
                    <h3 className="text-white font-bold text-xs">GitHub Portfolio</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Accepted solutions are automatically organized into dedicated repositories. Build a clean portfolio effortlessly.</p>
                  </div>
                  <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl space-y-2">
                    <div className="text-xl">⚡</div>
                    <h3 className="text-white font-bold text-xs">Companion Extension</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Detects accepted LeetCode submissions and syncs them in the background. No manual exports needed.</p>
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
                    Connect your GitHub account now. CodePrep will create the portfolio repository only when your first solution is synced.
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
                        {githubConnected ? githubProfileUrl : 'Setup required to push solutions'}
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
                      disabled={isConnectingGithub}
                      className="cursor-pointer px-4 py-2 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 font-extrabold text-xs text-black rounded-xl transition shadow"
                    >
                      {isConnectingGithub ? 'Connecting...' : 'Connect GitHub'}
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
                    className={`cursor-pointer px-5 py-2.5 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 transition ${githubConnected
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
                  <h2 className="text-2xl font-extrabold text-white">
                    One last step before you can start automatic tracking.
                  </h2>
                  <p className="text-gray-400 text-sm">
                    This extension automatically detects your accepted LeetCode solutions and saves them to your GitHub. It is required only once.
                  </p>
                </div>

                {showGuide ? (
                  /* ═══════════════════════════════════════════════════════
                     INSTALLATION GUIDE
                     ═══════════════════════════════════════════════════════ */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowGuide(false)}
                        className="cursor-pointer text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition"
                      >
                        <FaArrowLeft size={10} /> Back to Extension Setup
                      </button>
                    </div>

                    <h3 className="text-white font-bold text-sm text-center">Step-by-Step Installation Guide</h3>

                    <div className="space-y-0">
                      {[
                        { num: 1, title: 'Download Extension ZIP', desc: 'Click the Download button below to save the extension package.', icon: <FaDownload size={14} /> },
                        { num: 2, title: 'Extract the ZIP', desc: 'Unzip the downloaded file to a folder on your computer.', icon: <FaDownload size={14} /> },
                        { num: 3, title: 'Open chrome://extensions', desc: 'Paste this URL into your address bar and press Enter.', icon: null, extra: true },
                        { num: 4, title: 'Enable Developer Mode', desc: 'Toggle the switch in the top-right corner of the page.', icon: null },
                        { num: 5, title: 'Click "Load Unpacked"', desc: 'A file picker dialog will open.', icon: null },
                        { num: 6, title: 'Select the extracted folder', desc: 'Choose the folder you extracted in Step 2 and click Select Folder.', icon: null },
                        { num: 7, title: 'Return to this page', desc: 'The extension will be detected automatically.', icon: null },
                      ].map((item, i) => (
                        <React.Fragment key={item.num}>
                          <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFB800] flex items-center justify-center text-black font-bold text-xs shrink-0">
                              {item.num}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-xs">{item.title}</p>
                              <p className="text-gray-500 text-[10px] mt-0.5">{item.desc}</p>
                              {item.extra && (
                                <div className="mt-2 flex items-center gap-2">
                                  <code className="text-[10px] font-mono text-gray-300 bg-white/5 px-2 py-1 rounded border border-white/5">
                                    chrome://extensions
                                  </code>
                                  <button
                                    onClick={handleCopyUrl}
                                    className="cursor-pointer text-[10px] font-bold text-[#FF7A00] hover:text-[#FFB800] flex items-center gap-1 transition"
                                  >
                                    <FaCopy size={9} /> {copiedUrl ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {i < 6 && (
                            <div className="flex justify-center py-1">
                              <svg width="10" height="16" viewBox="0 0 10 16" fill="none" className="text-gray-600">
                                <path d="M5 0L5 14M5 14L1 10M5 14L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ═══════════════════════════════════════════════════════
                     MAIN CONTENT
                     ═══════════════════════════════════════════════════════ */
                  <div className="space-y-6">
                    {/* ── Extension Connection Card ── */}
                    <AnimatePresence mode="wait">
                      {detectionState === 'success' ? (
                        /* Connected */
                        <motion.div
                          key="success-card"
                          initial={{ scale: 0.92, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.92, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                          className="bg-green-500/5 border border-green-500/20 p-6 rounded-2xl text-center space-y-3"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                          >
                            <FaCheckCircle size={36} className="text-green-400 mx-auto" />
                          </motion.div>
                          <h3 className="text-white font-bold text-sm">✅ Extension Detected</h3>
                          <p className="text-gray-400 text-xs">
                            Ready for Automatic Sync
                          </p>
                        </motion.div>
                      ) : (
                        /* Not Connected */
                        <motion.div
                          key="not-connected-card"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="bg-[#0B0B0F] border border-white/5 p-6 rounded-2xl space-y-5"
                        >
                          <div className="text-center min-h-[70px] flex flex-col justify-center">
                            <AnimatePresence mode="wait">
                              {detectionState === 'checking' && (
                                <motion.div
                                  key="checking"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.25 }}
                                  className="space-y-3"
                                >
                                  <FaSpinner className="animate-spin text-[#FF7A00] mx-auto" size={32} />
                                  <div className="space-y-0.5">
                                    <h3 className="text-white font-bold text-sm">Checking for extension...</h3>
                                    <p className="text-gray-400 text-xs">
                                      Establishing a secure connection with CodePrep companion.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                              {detectionState === 'failure' && (
                                <motion.div
                                  key="failure"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.25 }}
                                  className="space-y-3"
                                >
                                  <FaExclamationCircle size={32} className="text-red-400 mx-auto" />
                                  <div className="space-y-0.5">
                                    <h3 className="text-red-400 font-bold text-sm">❌ Extension not installed</h3>
                                    <p className="text-gray-400 text-xs px-4">
                                      Please install it and click the button again.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                              {detectionState === 'idle' && (
                                <motion.div
                                  key="idle"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-2"
                                >
                                  <h3 className="text-white font-bold text-sm">Companion Extension Required</h3>
                                  <p className="text-gray-400 text-xs">
                                    Install the extension once. After installation everything works automatically.
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {detectionState !== 'checking' && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.15 }}
                              className="flex flex-col sm:flex-row gap-3 justify-center"
                            >
                              <a
                                href="/downloads/leetcode-companion-extension.zip"
                                download
                                onClick={handleDownloadExtension}
                                className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 font-extrabold text-xs text-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#FF7A00]/10 transition"
                              >
                                <FaDownload size={12} /> Download Extension
                              </a>
                              <a
                                href="/downloads/LeetCode_Extension_Setup_Guide.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 font-extrabold text-xs text-gray-300 hover:text-white rounded-xl flex items-center justify-center gap-2 transition"
                              >
                                📘 Installation Guide (PDF)
                              </a>
                            </motion.div>
                          )}

                          <p className="text-gray-400 text-[11px] text-center max-w-md mx-auto leading-relaxed">
                            Need help installing the extension?<br />
                            Download the step-by-step installation guide (PDF) and follow the screenshots.
                          </p>

                          <div className="flex justify-center">
                            <button
                              onClick={handleInstalledClick}
                              disabled={detectionState === 'checking'}
                              className={`cursor-pointer px-6 py-3 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition w-full sm:w-auto ${detectionState === 'checking'
                                  ? 'bg-white/10 text-gray-400 border border-white/5 cursor-wait shadow-none'
                                  : 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 text-black shadow-lg shadow-[#FF7A00]/10'
                                }`}
                            >
                              {detectionState === 'checking' ? (
                                <>
                                  <FaSpinner className="animate-spin" size={14} />
                                  Checking...
                                </>
                              ) : (
                                <>I've Installed the Extension</>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── FAQ Section ── */}
                    <div className="bg-[#0B0B0F] border border-white/5 p-5 rounded-2xl space-y-3">
                      <h3 className="text-white font-bold text-xs flex items-center gap-2 border-b border-white/5 pb-2.5">
                        <FaQuestionCircle size={12} className="text-[#FF7A00]" /> Need Help?
                      </h3>
                      <div className="space-y-1">
                        {faqItems.map((item, idx) => (
                          <div key={idx} className="border-b border-white/5 last:border-0 pb-2 last:pb-0">
                            <button
                              onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                              className="cursor-pointer w-full flex items-center justify-between gap-2 text-left py-1.5 text-[11px] font-bold text-gray-300 hover:text-white transition"
                            >
                              {item.q}
                              {openFaqIndex === idx ? (
                                <FaChevronUp size={9} className="text-gray-500 shrink-0" />
                              ) : (
                                <FaChevronDown size={9} className="text-gray-500 shrink-0" />
                              )}
                            </button>
                            {openFaqIndex === idx && (
                              <motion.p
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="text-[10px] text-gray-500 pb-1.5 leading-relaxed"
                              >
                                {item.a}
                              </motion.p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Navigation ── */}
                    <div className="pt-2 flex justify-between">
                      <button
                        onClick={() => setStep(2)}
                        className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep(4)}
                        disabled={!extensionConnected}
                        className={`cursor-pointer px-5 py-2.5 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 transition ${extensionConnected
                            ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 shadow-lg shadow-[#FF7A00]/10'
                            : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
                          }`}
                      >
                        Continue <FaArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                )}
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
                      className={`cursor-pointer px-5 py-2.5 font-extrabold text-xs text-black rounded-xl flex items-center gap-2 transition ${!isCompleting && githubConnected && extensionConnected
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
