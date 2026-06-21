import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/store';
import { logout } from '../store/authSlice';

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate   = useNavigate();
  const dispatch   = useAppDispatch();

  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setMobileOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
          : 'bg-[#0B0B0F]/40 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#FF7A00] rounded-lg blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#FF7A00] to-[#FFD700] p-1.5 rounded-lg">
                <Zap size={16} className="text-black fill-black" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-white">CodePrep</span>{' '}
              <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFD700] bg-clip-text text-transparent">AI</span>
            </span>
          </Link>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Dashboard Link */}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  <LayoutDashboard size={14} className="text-[#FF7A00]" />
                  Dashboard
                </Link>

                {/* Username Greeting */}
                <span className="text-sm font-semibold text-gray-300 px-3 py-1.5 bg-white/5 rounded-lg border border-white/8">
                  Hi, {user?.name || 'User'}
                </span>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="cursor-pointer flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FF7A00] px-4 py-2 rounded-lg hover:bg-[#FF7A00]/5 border border-transparent hover:border-[#FF7A00]/20 transition-all font-semibold"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Guest Actions */}
                <Link
                  to="/login"
                  className="text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="relative group text-sm font-semibold text-black px-5 py-2 rounded-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700] opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
                  <span className="relative">Get Started</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0D0D12]/98 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-6 py-5 flex flex-col gap-3">
              {isAuthenticated ? (
                <>
                  <div className="text-xs text-gray-500 pb-1 border-b border-white/5">
                    Welcome, <span className="text-white font-semibold">{user?.name || 'User'}</span>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={closeMobile}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white py-2 transition-colors"
                  >
                    <LayoutDashboard size={14} className="text-[#FF7A00]" /> Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer flex items-center gap-2 text-sm text-[#FF7A00] hover:text-[#FFB800] py-2 transition-colors text-left"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobile}
                    className="text-sm text-gray-300 hover:text-white py-2 transition-colors">
                    Login
                  </Link>
                  <Link to="/register" onClick={closeMobile}
                    className="text-sm font-bold text-black text-center py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFD700]">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
