import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from './store/store';

import Home          from './pages/Home';
import Dashboard     from './pages/Dashboard';
import CompanyPage   from './pages/CompanyPage';
import Login         from './pages/Login';
import Register      from './pages/Register';

// Dashboard pages
import DSAPractice      from './pages/dashboard/DSAPractice';
import CompaniesPage    from './pages/dashboard/CompaniesPage';
import Arena            from './pages/dashboard/Arena';
import Roadmap          from './pages/dashboard/Roadmap';
import History          from './pages/dashboard/History';
import TopicQuestions   from './pages/dashboard/TopicQuestions';
import PracticeWorkspace from './pages/dashboard/PracticeWorkspace';

import GVChallenge      from './pages/dashboard/GVChallenge';

// Redirect logged-in users away from auth pages
const PublicOnlyRoute = () => {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

// Block guests from protected pages
const ProtectedRoute = () => {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white font-sans">
      <Routes>
        {/* Public — always accessible */}
        <Route path="/" element={<Home />} />

        {/* Public-only — redirect to /dashboard if already logged in */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected — redirect to /login if not logged in */}
        <Route element={<ProtectedRoute />}>
          {/* Main Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Dashboard Sub-Pages */}
          <Route path="/dashboard/dsa"          element={<DSAPractice />} />
          <Route path="/dashboard/companies"    element={<CompaniesPage />} />
          <Route path="/dashboard/gvchallenge"  element={<GVChallenge />} />
          <Route path="/dashboard/arena"        element={<Arena />} />
          <Route path="/dashboard/roadmap"      element={<Roadmap />} />
          <Route path="/dashboard/history"      element={<History />} />

          <Route path="/dashboard/practice/:questionId" element={<PracticeWorkspace />} />

          {/* Company-specific Page */}
          <Route path="/company/:name"       element={<CompanyPage />} />

          {/* Topic-specific Page */}
          <Route path="/topic/:topicName"    element={<TopicQuestions />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
