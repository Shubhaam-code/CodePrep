import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '../store/store';
import { loginSuccess } from '../store/authSlice';
import { signInWithGoogle, handleRedirectResult } from '../firebase/authFunctions';
import apiClient from '../api/axios';

function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle redirect sign-in result on page mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        console.log('[Login Page] Checking for Firebase redirect sign-in results...');
        const user = await handleRedirectResult();
        if (user) {
          console.log('[Login Page] Redirect result user resolved:', user);
          const idToken = await user.getIdToken();
          console.log('[Login Page] Exchanging redirect ID token with backend...');
          googleLoginMutation.mutate(idToken);
        } else {
          console.log('[Login Page] No redirect sign-in result found.');
        }
      } catch (err) {
        console.error('[Login Page] Error resolving redirect sign-in result:', err);
        setErrorMsg(err.message || 'Firebase redirect Google login failed.');
      }
    };
    checkRedirect();
  }, []);

  // 1. Traditional Email/Password Login Mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      console.log('[Login Page] Sending traditional login request for email:', credentials.email);
      const response = await apiClient.post('/api/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('[Login Page] Traditional login succeeded. Dispatching session token.');
      dispatch(loginSuccess(data));
      navigate('/dashboard');
    },
    onError: (err) => {
      console.error('[Login Page] Traditional login error:', err);
      if (!err.response) {
        setErrorMsg('Unable to connect to the server. Please check your internet connection and try again.');
      } else if (err.response.status === 429) {
        setErrorMsg('Too many failed login attempts. Please try again later.');
      } else if (err.response.status >= 500) {
        setErrorMsg('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Login failed. Please verify credentials.');
      }
    },
  });

  // 2. Firebase Google Authentication Mutation
  const googleLoginMutation = useMutation({
    mutationFn: async (idToken) => {
      console.log('[Login Page] Sending Firebase ID token to backend /api/auth/firebase (truncated):', idToken.substring(0, 30) + '...');
      const response = await apiClient.post('/api/auth/firebase', { idToken });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('[Login Page] Google login verification succeeded. Dispatching session token.');
      dispatch(loginSuccess(data));
      navigate('/dashboard');
    },
    onError: (err) => {
      console.error('[Login Page] Google login verification failed:', err);
      setErrorMsg(err.response?.data?.message || 'Google Sign-In backend verification failed.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    loginMutation.mutate({ email: trimmedEmail, password });
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      console.log('[Login Page] Starting signInWithGoogle flow...');
      const user = await signInWithGoogle();
      if (!user) {
        console.log('[Login Page] Redirect flow triggered or user was not resolved synchronously.');
        return;
      }
      console.log('[Login Page] Google login succeeded. User details:', user);
      const idToken = await user.getIdToken();
      console.log('[Login Page] Exchanging ID token with backend...');
      googleLoginMutation.mutate(idToken);
    } catch (err) {
      console.error('[Login Page] Google login failed:', err);
      setErrorMsg(err.message || 'Firebase Google Sign-In failed.');
    }
  };

  const isPending = loginMutation.isPending || googleLoginMutation.isPending;

  return (
    <div className="max-w-md w-full mx-auto my-12 bg-slate-900/30 border border-slate-900 rounded-3xl p-8 space-y-6 shadow-xl shadow-black/10">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-100">Welcome Back</h2>
        <p className="text-xs text-slate-500">Sign in to track your LeetCode questions progress.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3.5 text-xs text-red-400 text-center">
          {errorMsg}
        </div>
      )}

      {/* Traditional Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#FF7A00] placeholder-slate-700 transition"
            required
            disabled={isPending}
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#FF7A00] placeholder-slate-700 transition"
            required
            disabled={isPending}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer w-full py-2.5 font-bold text-sm text-black bg-gradient-to-r from-[#FF7A00] to-[#FFB800] hover:opacity-90 rounded-xl shadow-lg hover:shadow-[#FF7A00]/20 transition duration-200"
        >
          {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-800"></div>
        <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider">Or</span>
        <div className="flex-grow border-t border-slate-800"></div>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="cursor-pointer w-full py-2.5 font-bold text-sm text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-md hover:shadow-lg"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.41 7.54l3.86 3C6.18 7.6 8.88 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.09 2.67-2.31 3.49l3.58 2.78c2.1-1.94 3.79-4.8 3.79-8.42z" />
          <path fill="#FBBC05" d="M5.27 10.54c-.26-.81-.41-1.68-.41-2.58s.15-1.77.41-2.58l-3.86-3C.56 4.37 0 6.13 0 8s.56 3.63 1.41 5.58l3.86-3.04z" />
          <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.58-2.78c-1 .67-2.28 1.07-3.83 1.07-3.12 0-5.82-2.56-6.73-5.5l-3.86 3C3.37 20.35 7.35 23 12 23z" />
        </svg>
        {googleLoginMutation.isPending ? 'Verifying Session...' : 'Continue with Google'}
      </button>

      <div className="text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#FFB800] hover:text-[#FF7A00] hover:underline transition-colors">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default Login;
