import { motion } from 'framer-motion';

/* ── Feature data — only real implemented features ── */
const features = [
  {
    emoji: '🏢',
    title: 'Company-Wise Questions',
    description:
      'Practice curated interview questions from top product-based companies including Google, Amazon, Microsoft, Meta, Adobe, Uber, Walmart and many more.',
    glow: '#FF7A00',
    badge: 'Core Feature',
    badgeColor: '#FF7A00',
    stat: '3500+',
    statLabel: 'Questions',
  },
  {
    emoji: '📊',
    title: '150+ Companies',
    description:
      'Browse company-specific question sets and focus your preparation on the exact companies you are targeting.',
    glow: '#FFB800',
    badge: 'Coverage',
    badgeColor: '#FFB800',
    stat: '150+',
    statLabel: 'Companies',
  },
  {
    emoji: '🏆',
    title: 'GV Challenge',
    description:
      'Solve structured coding challenges and strengthen problem-solving skills through guided practice.',
    glow: '#FFD700',
    badge: 'Challenge',
    badgeColor: '#FFD700',
    stat: 'Weekly',
    statLabel: 'Challenges',
  },
  {
    emoji: '🗺️',
    title: 'Learning Roadmaps',
    description:
      'Follow step-by-step DSA and interview preparation roadmaps designed to help you stay on track.',
    glow: '#22C55E',
    badge: 'Preparation',
    badgeColor: '#22C55E',
    stat: 'Structured',
    statLabel: 'Paths',
  },
  {
    emoji: '⏳',
    title: 'Question History',
    description:
      'Track previously viewed and solved questions so you can continue your preparation without losing progress.',
    glow: '#8B5CF6',
    badge: 'Tracking',
    badgeColor: '#8B5CF6',
    stat: 'Progress',
    statLabel: 'Tracking',
  },
  {
    emoji: '🔍',
    title: 'Quick Search',
    description:
      'Instantly find questions using company name, topic, difficulty level, or keyword search.',
    glow: '#38BDF8',
    badge: 'Productivity',
    badgeColor: '#38BDF8',
    stat: 'Fast',
    statLabel: 'Discovery',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 36, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-28 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,122,0,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-16 max-w-2xl mx-auto"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00] mb-3">
          What You Get
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
          Built for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #FF7A00, #FFB800, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Serious Prep.
          </span>
        </h2>
        <p className="text-gray-400 text-base leading-relaxed">
          Every tool you need to practice company-wise DSA, track your readiness,
          and simulate real assessments — all in one place.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={item}
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative rounded-2xl p-6 cursor-default overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Hover glow overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${f.glow}0A 0%, transparent 70%)`,
                boxShadow: `inset 0 0 60px ${f.glow}10`,
              }}
            />

            {/* Top glow line */}
            <div
              className="absolute top-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `linear-gradient(90deg, transparent, ${f.glow}80, transparent)` }}
            />

            {/* Corner accent */}
            <div
              className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle at top right, ${f.glow}20, transparent 70%)`,
              }}
            />

            {/* Badge */}
            <div className="flex items-center justify-between mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `${f.glow}12`,
                  border: `1px solid ${f.glow}28`,
                }}
              >
                {f.emoji}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `${f.badgeColor}15`,
                    color: f.badgeColor,
                    border: `1px solid ${f.badgeColor}30`,
                  }}
                >
                  {f.badge}
                </span>
              </div>
            </div>

            {/* Content */}
            <h3
              className="text-white font-bold text-base mb-2.5 transition-colors duration-300 group-hover:text-[#FFB800] leading-snug"
            >
              {f.title}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors duration-300">
              {f.description}
            </p>

            {/* Stat */}
            <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-white/5">
              <span
                className="text-sm font-extrabold"
                style={{ color: f.glow }}
              >
                {f.stat}
              </span>
              <span className="text-xs text-gray-600">{f.statLabel}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom CTA hint */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center mt-16"
      >
        <p className="text-gray-600 text-sm">
          All features available immediately after sign up.{' '}
          <span className="text-[#FF7A00] font-semibold">No trial period.</span>
        </p>
      </motion.div>
    </section>
  );
}
