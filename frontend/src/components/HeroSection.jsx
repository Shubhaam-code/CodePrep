import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Zap, Code2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/store';

/* ── Stats shown in hero ── */
const stats = [
  { value: '3,500+', label: 'Questions', icon: <Code2 size={14} />,  color: '#FF7A00' },
  { value: '150+',   label: 'Companies', icon: <Trophy size={14} />, color: '#FFB800' },
  { value: '100%',   label: 'Free',      icon: <Zap size={14} />,    color: '#22C55E' },
];

/* ── Synthetic code lines for the code card ── */
const codeLines = [
  { parts: [{ t: 'def ',        c: 'text-[#FF7A00]'  }, { t: 'twoSum',          c: 'text-yellow-300' }, { t: '(nums, target):', c: 'text-gray-400' }] },
  { parts: [{ t: '  seen',      c: 'text-blue-300'   }, { t: ' = {}',            c: 'text-gray-400'   }] },
  { parts: [{ t: '  for ',      c: 'text-[#FF7A00]'  }, { t: 'i, n',            c: 'text-blue-300'   }, { t: ' in ',           c: 'text-[#FF7A00]' }, { t: 'enumerate', c: 'text-yellow-300' }, { t: '(nums):', c: 'text-gray-400' }] },
  { parts: [{ t: '    comp',    c: 'text-purple-300' }, { t: ' = target - n',    c: 'text-gray-400'   }] },
  { parts: [{ t: '    if ',     c: 'text-[#FF7A00]'  }, { t: 'comp',            c: 'text-purple-300' }, { t: ' in seen:',      c: 'text-gray-400'  }] },
  { parts: [{ t: '      return', c: 'text-[#FF7A00]' }, { t: ' [seen[comp], i]', c: 'text-green-400'  }] },
  { parts: [{ t: '    seen',    c: 'text-blue-300'   }, { t: '[n] = i',          c: 'text-gray-400'   }] },
];

/* ── Right-side floating cards (stacked vertically) ── */
const rightCards = [
  { icon: '🔍', label: 'Two Sum',         tag: 'Easy',   company: 'Google',    tagColor: '#4ade80', freq: 94 },
  { icon: '⚡', label: 'LRU Cache',       tag: 'Hard',   company: 'Meta',      tagColor: '#f87171', freq: 81 },
  { icon: '🌲', label: 'Binary Tree LCA', tag: 'Medium', company: 'Amazon',    tagColor: '#fbbf24', freq: 73 },
];

function FreqBar({ freq, color }) {
  return (
    <div className="mt-2 h-0.5 rounded-full bg-white/6 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${freq}%` }}
        transition={{ duration: 1.2, delay: 1.2, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export default function HeroSection() {
  const { scrollY } = useScroll();
  const heroY       = useTransform(scrollY, [0, 500], [0, -60]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const { isAuthenticated } = useAppSelector((s) => s.auth);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">

      {/* ── Background layers ── */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(255,122,0,0.12) 0%, transparent 65%)' }}
      />
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 -left-48 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,122,0,0.14) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <motion.div
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-1/4 -right-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      {/* ── Left floating column of problem cards ── */}
      <div className="hidden xl:flex flex-col gap-3 absolute left-6 2xl:left-16 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '200px' }}>
        {rightCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ y: [0, -(6 + i * 2), 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              className="rounded-xl px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: `${card.tagColor}15`, border: `1px solid ${card.tagColor}30` }}
                >
                  {card.icon}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white/90 truncate">{card.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                      style={{ color: card.tagColor, background: `${card.tagColor}18` }}
                    >{card.tag}</span>
                    <span className="text-[10px] text-gray-500 truncate">{card.company}</span>
                  </div>
                </div>
              </div>
              <FreqBar freq={card.freq} color={card.tagColor} />
              <p className="text-[9px] text-gray-600 mt-1">Freq: {card.freq}%</p>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* ── Code card (right side, desktop) ── */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:block absolute right-6 2xl:right-20 top-1/2 -translate-y-1/2"
        style={{ width: '230px' }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-xl p-4 relative overflow-hidden"
          style={{
            background: 'rgba(10,10,18,0.9)',
            border: '1px solid rgba(255,122,0,0.18)',
            backdropFilter: 'blur(20px)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {/* Scan line */}
          <motion.div
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
            className="absolute left-0 right-0 h-6 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(255,122,0,0.05), transparent)' }}
          />

          {/* Terminal dots */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="text-[9px] text-gray-600 ml-auto font-mono">solution.py</span>
          </div>

          {/* Code lines */}
          <div className="space-y-1.5 text-[10px]">
            {codeLines.map((line, li) => (
              <motion.p key={li}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + li * 0.07 }}
              >
                {line.parts.map((part, pi) => (
                  <span key={pi} className={part.c}>{part.t}</span>
                ))}
              </motion.p>
            ))}
          </div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-3 pt-2.5 border-t border-white/6 flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-mono">Accepted · 96ms · O(n)</span>
          </motion.div>
        </motion.div>

        {/* Label below code card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg mx-auto w-fit"
          style={{ background: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] animate-pulse" />
          <span className="text-[10px] text-[#FFB800] font-semibold">FAANG & Top Tech Questions</span>
        </motion.div>
      </motion.div>

      {/* ── Main Content ── */}
      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 text-center max-w-3xl mx-auto px-6"
      >
        {/* Badge — fixed: no nested ping inside the badge container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2"
            style={{
              background: 'rgba(255,122,0,0.1)',
              border: '1px solid rgba(255,122,0,0.25)',
            }}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A00] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF7A00]" />
            </span>
            <span className="text-xs font-semibold text-[#FFB800] whitespace-nowrap">
              🏢 Company-Wise Interview Prep · 100% Free
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.07] mb-6"
        >
          <span className="text-white block">Crack Your</span>
          <span className="block mt-1"
            style={{
              background: 'linear-gradient(135deg, #FF7A00 0%, #FFB800 45%, #FFD700 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Dream Company
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.26 }}
          className="text-gray-400 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Real DSA questions from{' '}
          <span className="text-white font-semibold">Google, Amazon, Microsoft</span>{' '}
          and 150+ companies — sorted by frequency, completely free.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.38 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {isAuthenticated ? (
            <Link to="/dashboard"
              className="group relative inline-flex items-center gap-2 text-base font-bold text-black px-8 py-3.5 rounded-xl overflow-hidden shadow-xl shadow-[#FF7A00]/25 transition-transform hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
              <span className="relative">Go to Dashboard</span>
              <ArrowRight size={16} className="relative transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <>
              <Link to="/register"
                className="group relative inline-flex items-center gap-2 text-base font-bold text-black px-8 py-3.5 rounded-xl overflow-hidden shadow-xl shadow-[#FF7A00]/25 transition-transform hover:-translate-y-0.5 w-full sm:w-auto justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#FF9500] to-[#FFD700] transition-opacity" />
                <span className="relative">Start Practicing Free</span>
                <ArrowRight size={16} className="relative transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 text-base font-medium text-gray-300 hover:text-white px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/4 hover:bg-white/8 transition-all w-full sm:w-auto"
              >
                Sign In
              </Link>
            </>
          )}
        </motion.div>

        {/* Sub-note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-gray-600 text-xs mt-4 font-medium"
        >
          No credit card · No subscription · Just practice
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-10"
        >
          {stats.map((s) => (
            <div key={s.label}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-sm font-bold text-white">{s.value}</span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0B0B0F, transparent)' }}
      />
    </section>
  );
}
