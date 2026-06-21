import { motion } from 'framer-motion';

// Only real, implemented features
const features = [
  {
    emoji: '🏢',
    title: 'Company-Wise Questions',
    description: 'Practice questions from Google, Amazon, Microsoft, Meta and 100+ companies — sorted by interview frequency.',
    glow: '#FF7A00',
  },
  {
    emoji: '📊',
    title: 'Progress Tracking',
    description: 'Mark questions as solved and watch your per-company progress bar grow in real time.',
    glow: '#FFB800',
  },
  {
    emoji: '⭐',
    title: 'Bookmarks',
    description: 'Star any question to revisit later. Your bookmarks sync across sessions.',
    glow: '#FFD700',
  },
  {
    emoji: '🔥',
    title: 'Daily Streak',
    description: 'Stay consistent — your streak increments every day you solve at least one question.',
    glow: '#FF7A00',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-4 relative">
      <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
        className="text-center mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00] mb-3">What You Get</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          Built for{' '}
          <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFD700] bg-clip-text text-transparent">Serious Prep.</span>
        </h2>
        <p className="text-gray-400 text-base max-w-xl mx-auto">
          Everything you need to practice company-wise DSA and track your readiness.
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once:true }}
        className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
        {features.map((f) => (
          <motion.div key={f.title} variants={item} whileHover={{ y:-4, scale:1.02 }}
            transition={{ type:'spring', stiffness:300 }}
            className="group relative bg-white/[0.03] border border-white/8 rounded-2xl p-6 cursor-default overflow-hidden">
            {/* Glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
              style={{ boxShadow:`inset 0 0 60px ${f.glow}15`, border:`1px solid ${f.glow}40` }} />
            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background:`linear-gradient(90deg, transparent, ${f.glow}, transparent)` }} />

            <div className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl"
              style={{ background:`${f.glow}15`, border:`1px solid ${f.glow}30` }}>
              {f.emoji}
            </div>
            <h3 className="text-white font-bold text-base mb-2 group-hover:text-[#FFB800] transition-colors">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
