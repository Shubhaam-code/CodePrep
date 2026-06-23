import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home, LayoutDashboard, Building, Trophy, Map, History, Settings, LogOut
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { logout } from '../../store/authSlice';

// Desktop Nav Items
const NAV_ITEMS = [
  { 
    icon: Home,
    label: "Home",
    path: "/"
  },
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/dashboard" 
  },
  { 
    icon: Building, 
    label: "Company Questions", 
    path: "/dashboard/dsa" 
  },
  { 
    icon: Trophy, 
    label: "GV Challenge", 
    path: "/dashboard/gvchallenge" 
  },
  { 
    icon: Map, 
    label: "Roadmap", 
    path: "/dashboard/roadmap"
  },
  { 
    icon: History, 
    label: "History", 
    path: "/dashboard/history" 
  },
];

// Mobile Navigation Tabs
const MOBILE_TABS = [
  { icon: Home,            label: 'Home',              path: '/' },
  { icon: LayoutDashboard, label: 'Dash',              path: '/dashboard' },
  { icon: Building,        label: 'Company Questions', path: '/dashboard/dsa' },
  { icon: Trophy,          label: 'GV',                path: '/dashboard/gvchallenge' },
  { icon: Map,             label: 'Roadmap',           path: '/dashboard/roadmap' },
];

/* ── Letter avatar color mapping ── */
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
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      {/* ══ Desktop Sidebar ══ */}
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 shrink-0 select-none"
        style={{
          width: '220px',
          background: 'var(--bg-card, #0F0F1A)',
          borderRight: '1px solid var(--border, rgba(255,255,255,0.06))',
        }}
      >
        {/* Logo */}
        <div
          className="px-4 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}
        >
          <Link to="/dashboard" className="flex items-center gap-2 group w-full">
            <img
              src="/imagecopy.png"
              alt="CodePrep AI"
              className="w-full h-auto transition-opacity group-hover:opacity-90"
            />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 pt-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <Link key={path} to={path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-150 ${
                    active ? '' : 'hover:bg-[rgba(255,255,255,0.04)] hover:text-[#94A3B8]'
                  }`}
                  style={{
                    background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                    color: active ? '#FF7A00' : '#475569',
                    borderLeft: active ? '2px solid #FF7A00' : '2px solid transparent',
                    borderRadius: active ? '0 8px 8px 0' : '8px',
                  }}
                >
                  <Icon
                    size={16}
                    style={{ color: active ? '#FF7A00' : 'inherit', flexShrink: 0 }}
                  />
                  <span className="flex-1">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: User Info + Settings + Logout */}
        <div
          className="mt-auto"
          style={{ borderTop: '1px solid var(--border, rgba(255,255,255,0.06))', padding: '12px' }}
        >
          {/* User Profile Card */}
          <div
            className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg"
            style={{ background: 'var(--bg-hover, #141428)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
              style={{ background: getLetterColor(user?.name || '') }}
            >
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] truncate leading-tight" style={{ color: 'var(--text-3, #475569)' }}>
                {user?.email || ''}
              </p>
            </div>
          </div>

          {/* Settings */}
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#94A3B8]"
            style={{
              background: 'transparent',
              color: '#475569',
              borderLeft: '2px solid transparent',
            }}
          >
            <Settings size={16} style={{ flexShrink: 0 }} />
            <span>Settings</span>
          </div>

          {/* Logout */}
          <div
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 hover:text-[#EF4444]"
            style={{
              background: 'transparent',
              color: '#475569',
              borderLeft: '2px solid transparent',
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* ══ Mobile Bottom Tab Bar ══ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          background: 'var(--bg-card, #0F0F1A)',
          borderTop: '1px solid var(--border, rgba(255,255,255,0.06))',
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
                color: active ? '#FF7A00' : '#475569',
                background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                minWidth: '52px',
              }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}

        {/* Logout tab on mobile */}
        <button
          onClick={handleLogout}
          className="cursor-pointer flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 hover:text-[#EF4444]"
          style={{ color: '#475569', minWidth: '52px' }}
        >
          <LogOut size={20} />
          <span className="text-[10px] font-semibold leading-none">Exit</span>
        </button>
      </nav>
    </>
  );
}
