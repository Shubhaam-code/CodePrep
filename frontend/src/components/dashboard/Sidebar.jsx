import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FaHome as Home, FaTrophy as Trophy, FaCodeBranch as RoadmapIcon,
  FaClock as History, FaCog as Settings, FaArrowRight as LogOutIcon,
  FaBuilding as Building, FaCircle as DashIcon, FaGithub as GithubIcon,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { logout } from '../../store/authSlice';

// Desktop Nav Items
const NAV_ITEMS = [
  { icon: Home,        label: 'Home',             path: '/' },
  { icon: DashIcon,    label: 'Dashboard',        path: '/dashboard' },
  { icon: Building,    label: 'Company Questions', path: '/dashboard/dsa' },
  { icon: GithubIcon,  label: 'GitHub Sync',      path: '/profile/github' },
  { icon: Trophy,      label: 'GV Challenge',     path: '/dashboard/gvchallenge' },
  { icon: RoadmapIcon, label: 'Roadmap',          path: '/dashboard/roadmap' },
  { icon: History,     label: 'History',          path: '/dashboard/history' },
];

// Mobile Navigation Tabs
const MOBILE_TABS = [
  { icon: Home,        label: 'Home',    path: '/' },
  { icon: DashIcon,    label: 'Dash',   path: '/dashboard' },
  { icon: Building,    label: 'Company', path: '/dashboard/dsa' },
  { icon: Trophy,      label: 'GV',     path: '/dashboard/gvchallenge' },
  { icon: RoadmapIcon, label: 'Roadmap', path: '/dashboard/roadmap' },
];

const COLLAPSED_W = 64;
const EXPANDED_W  = 220;

function getLetterColor(name = '') {
  const ch = name[0]?.toUpperCase() || 'A';
  const map = {
    'ABC': '#FF7A00', 'DEF': '#8B5CF6', 'GHI': '#3B82F6',
    'JKL': '#10B981', 'MNO': '#F59E0B', 'PQR': '#EF4444',
    'STU': '#06B6D4', 'VWX': '#EC4899', 'YZ': '#6366F1',
  };
  for (const [chars, color] of Object.entries(map)) {
    if (chars.includes(ch)) return color;
  }
  return '#FF7A00';
}

export default function Sidebar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const { user }  = useAppSelector((s) => s.auth);

  // ── Hover-driven open/close ──────────────────────────────────────────────
  // `baseCollapsed` is the persistent intent (for non-hover pages).
  // `hovered` is the transient hover override.
  const [baseCollapsed, setBaseCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  const [hovered, setHovered] = useState(false);
  const leaveTimerRef = useRef(null);

  // The effective collapsed state: open while hovering, otherwise use base.
  const collapsed = hovered ? false : baseCollapsed;

  const handleSidebarEnter = () => {
    // Cancel any pending auto-close
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHovered(true);
  };

  const handleSidebarLeave = () => {
    // Debounce: wait 280ms before collapsing to prevent flicker
    leaveTimerRef.current = setTimeout(() => {
      setHovered(false);
      leaveTimerRef.current = null;
    }, 280);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // Auto-collapse when entering the GV Challenge page
  useEffect(() => {
    if (location.pathname === '/dashboard/gvchallenge') {
      setBaseCollapsed(true);
      setHovered(false);
      try { localStorage.setItem('sidebar-collapsed', 'true'); } catch {}
    }
  }, [location.pathname]);

  // Also respond to the custom event dispatched by GVChallenge on mount
  useEffect(() => {
    const handler = () => {
      setBaseCollapsed(true);
      setHovered(false);
      try { localStorage.setItem('sidebar-collapsed', 'true'); } catch {}
    };
    window.addEventListener('gv-challenge-entered', handler);
    return () => window.removeEventListener('gv-challenge-entered', handler);
  }, []);

  const sidebarW = collapsed ? COLLAPSED_W : EXPANDED_W;

  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      {/* ══ Desktop Sidebar ══ */}
      <motion.aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 shrink-0 select-none overflow-hidden"
        animate={{ width: sidebarW }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          background: '#0D0D0D',
          borderRight: '1px solid #1a1a1a',
        }}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
      >

        {/* Logo / Brand */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 shrink-0 border-b border-[#1a1a1a]"
          style={{
            minHeight: '84px',
          }}
        >
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <Link to="/dashboard" className="block">
                  <img
                    src="/imagecopy.png"
                    alt="CodePrep AI"
                    style={{ width: '180px', height: 'auto', objectFit: 'contain', display: 'block' }}
                  />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Link to="/dashboard" className="block">
                  <div className="w-[52px] h-[52px] flex items-center justify-center bg-transparent">
                    <img
                      src="/image.png"
                      alt="CodePrep Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Navigation */}
        <nav className="flex-1 px-3 pt-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <Link key={path} to={path}>
                <div
                  className="flex items-center gap-3.5 rounded-xl cursor-pointer transition-all duration-150 overflow-hidden"
                  style={{
                    padding: collapsed ? '11px 0' : '11px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    backgroundColor: active ? 'rgba(255,107,26,0.1)' : 'transparent',
                    color: active ? '#FF6B1A' : '#4b5563',
                    borderLeft: active ? '2px solid #FF6B1A' : '2px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#161616';
                      e.currentTarget.style.color = '#9ca3af';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#4b5563';
                    }
                  }}
                  title={collapsed ? label : ''}
                >
                  <Icon
                    size={15}
                    style={{ color: 'inherit', flexShrink: 0 }}
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-[13px] font-bold whitespace-nowrap overflow-hidden"
                        style={{ color: 'inherit' }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Logout only */}
        <div
          className="mt-auto px-3 py-5 overflow-hidden shrink-0 border-t border-[#1a1a1a]"
        >
          {/* Logout */}
          <div
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 overflow-hidden"
            style={{
              color: '#4b5563',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#4b5563';
            }}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOutIcon size={15} style={{ flexShrink: 0, color: 'inherit' }} />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="logout-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[13px] font-bold whitespace-nowrap overflow-hidden"
                  style={{ color: 'inherit' }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* ══ Mobile Bottom Tab Bar (unchanged) ══ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          background: '#0D0D0D',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        {MOBILE_TABS.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150"
              style={{
                color: active ? '#FF6B1A' : '#4b5563',
                background: active ? 'rgba(255,107,26,0.1)' : 'transparent',
                minWidth: '52px',
              }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="cursor-pointer flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 hover:text-[#EF4444]"
          style={{ color: '#4b5563', minWidth: '52px' }}
        >
          <LogOutIcon size={20} />
          <span className="text-[10px] font-semibold leading-none">Exit</span>
        </button>
      </nav>
    </>
  );
}
