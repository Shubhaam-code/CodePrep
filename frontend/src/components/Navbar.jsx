import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, LayoutDashboard, ChevronRight } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/store';
import { logout } from '../store/authSlice';

const navLinks = [
  { label: 'Company Questions', href: '/dashboard/dsa', icon: '🏢' },
  { label: 'GV Challenge', href: '/dashboard/gvchallenge', icon: '🏆' },
  { label: 'Roadmap', href: '/dashboard/roadmap', icon: '📚' },
  { label: 'History', href: '/dashboard/history', icon: '⏳' },
];

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const navigate   = useNavigate();
  const location   = useLocation();
  const dispatch   = useAppDispatch();

  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  const handleSocialClick = (provider) => {
    if (provider === 'github') {
      const url = user?.githubUrl || user?.githubProfileUrl || 'https://github.com';
      window.open(url, '_blank');
    } else if (provider === 'linkedin') {
      const url = user?.linkedinUrl || user?.linkedinProfileUrl || 'https://linkedin.com';
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setAvatarMenu(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Active checking logic including sub-pages (e.g. company profiles or roadmap topic questions)
  const isLinkActive = (href) => {
    if (href === '/dashboard/dsa') {
      return location.pathname.startsWith('/dashboard/dsa') || location.pathname.startsWith('/company');
    }
    if (href === '/dashboard/roadmap') {
      return location.pathname.startsWith('/dashboard/roadmap') || location.pathname.startsWith('/topic');
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0B0B0F]/92 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/40'
            : 'bg-transparent'
        }`}
      >
        {/* Subtle top glow line */}
        {scrolled && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/40 to-transparent" />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <img
                src="/imagecopy.png"
                alt="CodePrep AI"
                className="h-13 sm:h-24 md:h-28 w-auto transition-all duration-300 group-hover:scale-[1.03] group-hover:brightness-110"
              />
            </Link>

            {/* ── Desktop nav (auth users see links) ── */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map(({ label, href, icon }) => {
                  const active = isLinkActive(href);
                  return (
                    <Link key={href} to={href}
                      className={`relative flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg transition-all duration-200 font-medium ${
                        active
                          ? 'text-white bg-white/8'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-lg bg-white/6 border border-white/8"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative text-xs">{icon}</span>
                      <span className="relative">{label}</span>
                      {active && (
                        <span className="relative w-1 h-1 rounded-full bg-[#FF7A00] ml-0.5" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* ── Desktop Right Side ── */}
            <div className="hidden md:flex items-center gap-3">
              {/* Social account connections */}
              <div className="flex items-center gap-2 mr-1">
                {/* GitHub */}
                <button
                  onClick={() => handleSocialClick('github')}
                  title={user?.githubConnected ? "Open GitHub Profile" : "Connect GitHub"}
                  className="relative p-2 text-gray-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/8 rounded-xl transition duration-200"
                >
                  <FaGithub size={17} className={user?.githubConnected ? "text-[#22C55E]" : ""} />
                  {user?.githubConnected && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#0B0B0F]" />
                  )}
                </button>

                {/* LinkedIn */}
                <button
                  onClick={() => handleSocialClick('linkedin')}
                  title={user?.linkedinConnected ? "Open LinkedIn Profile" : "Connect LinkedIn"}
                  className="relative p-2 text-gray-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/8 rounded-xl transition duration-200"
                >
                  <FaLinkedin size={17} className={user?.linkedinConnected ? "text-[#0077B5]" : ""} />
                  {user?.linkedinConnected && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#0B0B0F]" />
                  )}
                </button>
              </div>

              {isAuthenticated ? (
                <>
                  {/* Avatar dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setAvatarMenu(!avatarMenu)}
                      className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/16 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs flex items-center justify-center select-none shadow-lg shadow-[#FF7A00]/20">
                        {initials}
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white font-medium max-w-[100px] truncate">
                        {user?.name?.split(' ')[0] || 'User'}
                      </span>
                      <ChevronRight
                        size={13}
                        className={`text-gray-500 transition-transform duration-200 ${avatarMenu ? 'rotate-90' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {avatarMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute right-0 top-full mt-2 w-52 bg-[#0F0F1A]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-white/6">
                            <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
                            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          </div>
                          <div className="p-1.5">
                            <Link to="/dashboard"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/6 rounded-lg transition-all"
                            >
                              <LayoutDashboard size={14} className="text-[#FF7A00]" />
                              Dashboard
                            </Link>
                          </div>
                          <div className="p-1.5 pt-0 border-t border-white/6">
                            <button
                              onClick={handleLogout}
                              className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/6 rounded-lg transition-all text-left"
                            >
                              <LogOut size={14} />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login"
                    className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all font-medium"
                  >
                    Sign In
                  </Link>
                  <Link to="/register"
                    className="relative group inline-flex items-center gap-1.5 text-sm font-bold text-black px-5 py-2.5 rounded-xl overflow-hidden shadow-lg shadow-[#FF7A00]/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#FF9500] via-[#FFD000] to-[#FF7A00] transition-opacity duration-300" />
                    <span className="relative">Get Started</span>
                    <ChevronRight size={14} className="relative transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile hamburger ── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition-all"
              aria-label="Toggle navigation menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span key="close"
                    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}
                  >
                    <X size={20} />
                  </motion.span>
                ) : (
                  <motion.span key="open"
                    initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}
                  >
                    <Menu size={20} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden bg-[#0C0C14]/98 backdrop-blur-2xl border-b border-white/6"
            >
              <div className="px-5 py-4 space-y-1">
                {/* Social account connections on mobile */}
                <div className="flex items-center justify-around py-2.5 mb-3 border border-white/8 bg-white/4 rounded-xl">
                  <span className="text-xs text-gray-400 font-semibold">Social Accounts</span>
                  <div className="flex gap-4">
                    {/* GitHub */}
                    <button
                      onClick={() => handleSocialClick('github')}
                      title={user?.githubConnected ? "Open GitHub Profile" : "Connect GitHub"}
                      className="relative p-2 text-gray-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/8 rounded-xl transition duration-200 flex items-center gap-1.5"
                    >
                      <FaGithub size={16} className={user?.githubConnected ? "text-[#22C55E]" : ""} />
                      <span className="text-xs">{user?.githubConnected ? "GitHub" : "Connect"}</span>
                      {user?.githubConnected && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#0B0B0F]" />
                      )}
                    </button>

                    {/* LinkedIn */}
                    <button
                      onClick={() => handleSocialClick('linkedin')}
                      title={user?.linkedinConnected ? "Open LinkedIn Profile" : "Connect LinkedIn"}
                      className="relative p-2 text-gray-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/8 rounded-xl transition duration-200 flex items-center gap-1.5"
                    >
                      <FaLinkedin size={16} className={user?.linkedinConnected ? "text-[#0077B5]" : ""} />
                      <span className="text-xs">{user?.linkedinConnected ? "LinkedIn" : "Connect"}</span>
                      {user?.linkedinConnected && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#0B0B0F]" />
                      )}
                    </button>
                  </div>
                </div>

                {isAuthenticated ? (
                  <>
                    {/* User header in mobile */}
                    <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-white/4 border border-white/8">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>

                    {navLinks.map(({ label, href, icon }) => {
                      const active = isLinkActive(href);
                      return (
                        <Link key={href} to={href}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            active
                              ? 'text-white bg-[#FF7A00]/10 border border-[#FF7A00]/20'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                          {active && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                          )}
                        </Link>
                      );
                    })}

                    <div className="pt-2 border-t border-white/6 mt-2">
                      <button
                        onClick={handleLogout}
                        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/6 rounded-xl transition-all text-left"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/login"
                      className="block px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      Sign In
                    </Link>
                    <Link to="/register"
                      className="block text-center text-sm font-bold text-black py-3 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFD700] shadow-lg shadow-[#FF7A00]/20"
                    >
                      Get Started Free →
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Backdrop for avatar dropdown */}
      <AnimatePresence>
        {avatarMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => setAvatarMenu(false)}
          />
        )}
      </AnimatePresence>


    </>
  );
}
