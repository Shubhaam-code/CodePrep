import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Code2, ClipboardList,
  Terminal, Map, History, Settings, Zap, ChevronRight, LogOut, Home
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/store';
import { logout } from '../../store/authSlice';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Code2,           label: 'DSA Practice', href: '/dashboard/dsa' },
  { icon: Home,            label: 'Home', href: '/' },
  { icon: ClipboardList,   label: 'Mock Assessments', href: '/dashboard/mock' },
  { icon: Terminal,        label: 'Coding Arena', href: '/dashboard/arena' },
  { icon: Map,             label: 'Roadmaps', href: '/dashboard/roadmap' },
  { icon: History,         label: 'History', href: '/dashboard/history' },
];

export default function Sidebar({ collapsed = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [hovered, setHovered] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen z-40 flex flex-col bg-[#0D0D12] border-r border-white/5 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-[#FF7A00] rounded-lg blur-md opacity-60" />
          <div className="relative bg-gradient-to-br from-[#FF7A00] to-[#FFD700] p-1.5 rounded-lg">
            <Zap size={14} className="text-black fill-black" />
          </div>
        </div>
        {!collapsed && (
          <span className="font-bold text-sm">
            <span className="text-white">CodePrep</span>{' '}
            <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFD700] bg-clip-text text-transparent">AI</span>
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.label} to={item.href}>
              <motion.div
                onHoverStart={() => setHovered(item.label)}
                onHoverEnd={() => setHovered(null)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                  active ? 'text-black font-extrabold' : 'text-gray-500 hover:text-gray-200'
                }`}
              >
                {active && (
                  <motion.div layoutId="activeTab"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFB800]" />
                )}
                {!active && hovered === item.label && (
                  <div className="absolute inset-0 rounded-xl bg-white/5" />
                )}
                <item.icon size={16} className="relative z-10 shrink-0" />
                {!collapsed && <span className="relative z-10 text-xs font-semibold">{item.label}</span>}
                {active && !collapsed && <ChevronRight size={12} className="relative z-10 ml-auto opacity-70" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-2 py-4 border-t border-white/5 space-y-1">
        <div onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/5 cursor-pointer transition-all">
          <LogOut size={16} />
          {!collapsed && <span className="text-xs font-semibold">Logout</span>}
        </div>
      </div>
    </aside>
  );
}
