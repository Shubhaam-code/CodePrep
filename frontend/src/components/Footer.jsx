import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/* ── Social SVG Icons ── */
const GithubIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const TwitterIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

/* ── Footer link columns ── */
const columns = [
  {
    title: 'Practice',
    links: [
      { label: 'Company Questions',   href: '/dashboard/companies' },
      { label: 'DSA Practice',        href: '/dashboard/dsa' },
      { label: 'Mock Assessments',    href: '/dashboard/mock' },
      { label: 'Coding Arena',        href: '/dashboard/arena' },
      { label: 'Roadmap',             href: '/dashboard/roadmap' },
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
  { Icon: GithubIcon,   label: 'GitHub',   href: '#' },
  { Icon: TwitterIcon,  label: 'Twitter',  href: '#' },
  { Icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
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
                src="/CodePrepLogoHorizontal.svg"
                alt="CodePrep AI"
                className="h-9 w-auto object-contain transition-all duration-300 group-hover:brightness-110"
              />
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
              The smartest way to crack tech interviews. Practice company-wise DSA,
              take mock assessments, and track your progress — all for free.
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
