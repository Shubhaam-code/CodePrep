import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaGithub } from 'react-icons/fa';

/* ── Footer link columns ── */
const columns = [
  {
    title: 'Practice',
    links: [
      { label: 'Company Questions',   href: '/dashboard/dsa' },
      { label: 'GV Challenge',        href: '/dashboard/gvchallenge' },
      { label: 'Roadmap',             href: '/dashboard/roadmap' },
      { label: 'History',             href: '/dashboard/history' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign Up — Free',  href: '/register' },
      { label: 'Sign In',         href: '/login' },
      { label: 'Dashboard',       href: '/dashboard' },
      { label: 'History',         href: '/dashboard/history' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy',   href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
];

const socials = [
  { Icon: FaGithub,   label: 'GitHub',   href: '#' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ background: 'linear-gradient(180deg, #080810 0%, #0B0B0F 100%)' }}
    >
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/30 to-transparent pointer-events-none" />

      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-sm opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Main footer content ── */}
        <div className="py-16 grid grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 mb-5 group">
              <img
                src="/imagecopy.png"
                alt="CodePrep AI"
                className="h-13 sm:h-24 md:h-28 w-auto transition-all duration-300 group-hover:brightness-110"
              />
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
              The smartest way to crack tech interviews. Practice company-wise DSA,
              follow learning roadmaps, and track your progress — all for free.
            </p>

            {/* Social icons */}
            <div className="flex gap-2">
              {socials.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-white transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,122,0,0.35)';
                    e.currentTarget.style.background = 'rgba(255,122,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>

            {/* Free badge */}
            <div className="inline-flex items-center gap-1.5 mt-6 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.2)',
                color: '#22C55E',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              100% Free — No Subscription
            </div>
          </div>

          {/* Link columns */}
          {columns.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-5"
                style={{ letterSpacing: '0.12em' }}
              >
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      to={href}
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors duration-200 hover-underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/[0.05] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} CodePrep AI. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            Built with
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[#FF7A00] mx-0.5"
            >
              ♥
            </motion.span>
            for engineers chasing their dream jobs
          </div>
        </div>
      </div>
    </footer>
  );
}
