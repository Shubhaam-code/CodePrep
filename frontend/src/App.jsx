import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from './store/store';

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
