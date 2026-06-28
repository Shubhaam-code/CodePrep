import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from './store/store';
import { setUser, logout } from './store/authSlice';
import apiClient from './api/axios';

import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CompanyPage from './pages/CompanyPage';
import Login from './pages/Login';
import Register from './pages/Register';
import DSAPractice from './pages/dashboard/DSAPractice';
import RoadmapList from './pages/dashboard/RoadmapList';
import RoadmapPatternDetail from './pages/dashboard/RoadmapPatternDetail';
import History from './pages/dashboard/History';
import TopicQuestions from './pages/dashboard/TopicQuestions';
import GVChallenge from './pages/dashboard/GVChallenge';
import GitHubProfilePage from './pages/GitHubProfilePage';
import Onboarding from './pages/Onboarding';

// Public only - redirect if logged in
const PublicOnlyRoute = () => {
  const isAuthenticated = useAppSelector(
    s => s.auth.isAuthenticated
  );
  return isAuthenticated 
    ? <Navigate to="/dashboard" replace /> 
    : <Outlet />;
};

// Protected - redirect if not logged in. If not onboarded and hasn't skipped, redirect to onboarding.
const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAppSelector(s => s.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const skippedOnboarding = sessionStorage.getItem('onboarding_skipped') === 'true';
  if (user && !user.isOnboarded && !skippedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <Outlet />;
};

// Onboarding - requires login, but only accessible if onboarding is incomplete.
const OnboardingRoute = () => {
  const { isAuthenticated, user } = useAppSelector(s => s.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user && user.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

export default function App() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const isAuthLoading = useAppSelector((s) => s.auth.isAuthLoading);
  const token = useAppSelector((s) => s.auth.token);

  // Verify authentication token on startup
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;
      try {
        const response = await apiClient.get('/api/auth/me');
        if (response.data) {
          dispatch(setUser(response.data));
        } else {
          dispatch(logout());
        }
      } catch (err) {
        console.error('[App] Initial authentication verification failed:', err);
        dispatch(logout());
      }
    };
    verifyToken();
  }, [token, dispatch]);

  // ─────────────────────────────────────────────────────────────────────
  // Extension-sync bridge (registered once at the application root)
  //
  // The CodePrep browser extension's content script (contentCodePrep.js)
  // watches chrome.storage.local and broadcasts on
  // BroadcastChannel('codeprep-sync') the moment a problem transitions
  // to syncState === 'synced' (i.e. /api/extension/sync succeeded).
  //
  // Mounted here — not in any page — so the listener is registered
  // exactly once for the entire app lifecycle.
  //
  // Two refresh paths fan out from this single listener:
  //   1. setUser(...) → pages that derive state from Redux
  //      (Dashboard, CompanyPage, Roadmap, etc.) re-render.
  //   2. invalidateQueries(...) → page-local query caches refetch:
  //        • ['gv-progress'] is read by GVChallenge (which now reads
  //          ONLY from /api/gvchallenge/progress — never from Redux).
  //        • ['dashboard'] powers the Dashboard summary stats.
  //        • ['githubStats'] powers the GitHub Sync card.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    if (!isAuthenticated) return undefined;

    const channel = new BroadcastChannel('codeprep-sync');
    const handleSyncCompleted = async (event) => {
      if (!event || event.data?.type !== 'codeprep:sync-completed') return;
      try {
        const profileRes = await apiClient.get('/api/auth/me');
        if (profileRes?.data) {
          dispatch(setUser(profileRes.data));
        }
        // Page-local query caches also need to refresh so derived
        // stats (GV progress, roadmap progress, dashboard summary) update.
        queryClient.invalidateQueries({ queryKey: ['gv-progress'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      } catch (err) {
        console.error('[App] Failed to refresh user after extension sync:', err);
      }
    };

    channel.addEventListener('message', handleSyncCompleted);
    return () => {
      channel.removeEventListener('message', handleSyncCompleted);
      channel.close();
    };
  }, [dispatch, isAuthenticated, queryClient]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/imagecopy.png"
            alt="CodePrep AI"
            className="h-10 sm:h-12 w-auto object-contain animate-pulse"
          />
          <span className="text-gray-400 text-sm font-semibold tracking-wider animate-pulse">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white font-sans">
      <Routes>
        {/* Public - always accessible */}
        <Route path="/" element={<Home />} />

        {/* Public only - redirect if logged in */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Onboarding route - requires auth but only for incomplete onboarding */}
        <Route element={<OnboardingRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Protected - redirect if not logged in */}
        <Route element={<ProtectedRoute />}>
          <Route 
            path="/dashboard" 
            element={<Dashboard />} 
          />
          <Route 
            path="/dashboard/dsa" 
            element={<DSAPractice />} 
          />
          <Route 
            path="/dashboard/gvchallenge" 
            element={<GVChallenge />} 
          />
          <Route
            path="/dashboard/roadmap"
            element={<RoadmapList />}
          />
          <Route
            path="/roadmap/:patternId"
            element={<RoadmapPatternDetail />}
          />
          <Route
            path="/dashboard/history" 
            element={<History />} 
          />
          <Route 
            path="/company/:name" 
            element={<CompanyPage />} 
          />
          <Route 
            path="/topic/:topicName" 
            element={<TopicQuestions />} 
          />
          <Route 
            path="/profile/github" 
            element={<GitHubProfilePage />} 
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
