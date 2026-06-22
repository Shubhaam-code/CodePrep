import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Code2, Trophy, Terminal,
  Map, History, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { logout } from '../../store/authSlice';

/* ── Nav items ── */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/dashboard',            exact: true  },
  { icon: Code2,           label: 'DSA Practice',path: '/dashboard/dsa',        exact: false },
  { icon: Trophy,          label: 'Mock Exam',    path: '/dashboard/mock',       exact: false },
  { icon: Terminal,        label: 'Playground',   path: '/dashboard/playground', exact: false },
  { icon: Map,             label: 'Roadmap',      path: '/dashboard/roadmap',    exact: false },
  { icon: History,         label: 'History',      path: '/dashboard/history',    exact: false },
];

const MOBILE_TABS = [
  { icon: LayoutDashboard, label: 'Home',     path: '/dashboard',       exact: true  },
  { icon: Code2,           label: 'DSA',      path: '/dashboard/dsa',   exact: false },
  { icon: Trophy,          label: 'Exam',     path: '/dashboard/mock',  exact: false },
  { icon: Terminal,        label: 'Play',     path: '/dashboard/playground', exact: false },
];

function isActive(pathname, item) {
  if (item.exact) return pathname === item.path;
  return pathname.startsWith(item.path);
}

/* ── Letter avatar colour (same logic as DSAPractice) ── */
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
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const { user }  = useAppSelector((s) => s.auth);

  const initials = (user?.name || 'U')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

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
        {/* ── Logo ── */}
        <div className="px-4 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}
        >
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <img
              src="/CodePrepLogoHorizontal.svg"
              alt="CodePrep AI"
              className="h-8 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 px-2 pt-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, path, exact }) => {
            const active = isActive(location.pathname, { path, exact });
            return (
              <Link key={path} to={path}>
                <div
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150"
                  style={{
                    background:  active ? 'var(--orange-dim, rgba(249,115,22,0.12))' : 'transparent',
                    color:       active ? 'var(--orange, #F97316)' : 'var(--text-3, #475569)',
                    fontWeight:  active ? '600' : '500',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-hover, #141428)';
                      e.currentTarget.style.color = 'var(--text-2, #94A3B8)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-3, #475569)';
                    }
                  }}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                      style={{ background: 'var(--orange, #F97316)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={16}
                    style={{ color: active ? 'var(--orange, #F97316)' : 'inherit', flexShrink: 0 }}
                  />
                  <span className="flex-1">{label}</span>
                  {active && (
                    <ChevronRight size={12} style={{ color: 'var(--orange, #F97316)', opacity: 0.6 }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom: user info + logout ── */}
        <div className="mt-auto"
          style={{ borderTop: '1px solid var(--border, rgba(255,255,255,0.06))', padding: '12px' }}
        >
          {/* User info row */}
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg"
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
          <button
            className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left"
            style={{ color: 'var(--text-3, #475569)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover, #141428)';
              e.currentTarget.style.color = 'var(--text-2, #94A3B8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-3, #475569)';
            }}
          >
            <Settings size={15} style={{ flexShrink: 0 }} />
            Settings
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left"
            style={{ color: 'var(--text-3, #475569)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.color = 'var(--red, #EF4444)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-3, #475569)';
            }}
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            Logout
          </button>
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
        {MOBILE_TABS.map(({ icon: Icon, label, path, exact }) => {
          const active = isActive(location.pathname, { path, exact });
          return (
            <Link key={path} to={path}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150"
              style={{
                color:      active ? 'var(--orange, #F97316)' : 'var(--text-3, #475569)',
                background: active ? 'var(--orange-dim, rgba(249,115,22,0.12))' : 'transparent',
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
          className="cursor-pointer flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150"
          style={{ color: 'var(--text-3, #475569)', minWidth: '52px' }}
        >
          <LogOut size={20} />
          <span className="text-[10px] font-semibold leading-none">Exit</span>
        </button>
      </nav>
    </>
  );
}
