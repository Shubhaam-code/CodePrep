import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from './store/store';
import { setUser } from './store/authSlice';
import apiClient from './api/axios';

import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CompanyPage from './pages/CompanyPage';
import Login from './pages/Login';
import Register from './pages/Register';
import DSAPractice from './pages/dashboard/DSAPractice';
import Roadmap from './pages/dashboard/Roadmap';
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
        // stats (GV progress, GitHub stats, dashboard summary) update.
        // Note: GVChallenge reads exclusively from ['gv-progress'],
        // not from Redux — this invalidation is what advances its day.
        queryClient.invalidateQueries({ queryKey: ['gv-progress'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['githubStats'] });
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
            element={<Roadmap />} 
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
