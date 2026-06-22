import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import apiClient from '../api/axios';

/* ── Company emoji map ── */
const COMPANY_EMOJI = {
  google: '🔍', amazon: '📦', microsoft: '🪟', meta: '🌐', apple: '🍎',
  uber: '🚗', adobe: '🎨', flipkart: '🛒', netflix: '🎬', linkedin: '💼',
  bytedance: '🎵', walmart: '🏪', bloomberg: '📊', atlassian: '🔷',
  goldman: '💰', salesforce: '☁️', twitter: '🐦', airbnb: '🏠',
  stripe: '💳', spotify: '🎧', reddit: '🤖', oracle: '🏛️',
  nvidia: '🎮', tesla: '⚡', lyft: '🚙', tiktok: '🎵',
  default: '🏢',
};

const getEmoji = (name) => {
  const key = name.toLowerCase().replace(/\s+/g, '');
  return (
    Object.entries(COMPANY_EMOJI).find(([k]) => key.includes(k))?.[1] ||
    COMPANY_EMOJI.default
  );
};

/* ── Colors cycling for variety ── */
const GLOW_COLORS = [
  '#FF7A00', '#FFB800', '#8B5CF6', '#22C55E',
  '#38BDF8', '#F472B6', '#FF7A00', '#FFB800',
];

function Strip({ companies, reverse = false, colorOffset = 0 }) {
  const doubled = [...companies, ...companies];
  return (
    <div className="overflow-hidden relative">
      <div
        className={`flex gap-3 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
        style={{ willChange: 'transform' }}
      >
        {doubled.map((c, i) => {
          const colorIdx = (i + colorOffset) % GLOW_COLORS.length;
          const glow = GLOW_COLORS[colorIdx];
          return (
            <span
              key={`${c}-${i}`}
              className="group inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-gray-400 rounded-xl px-4 py-2.5 cursor-default capitalize select-none transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${glow}50`;
                e.currentTarget.style.color = '#e2e8f0';
                e.currentTarget.style.background = `${glow}0D`;
                e.currentTarget.style.boxShadow = `0 0 16px ${glow}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.color = '';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="text-sm leading-none">{getEmoji(c)}</span>
              <span>{c.replace(/_/g, ' ')}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const FALLBACK = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Uber', 'Adobe', 'Flipkart', 'Goldman Sachs', 'Atlassian',
  'Netflix', 'LinkedIn', 'ByteDance', 'Walmart', 'Bloomberg',
  'Salesforce', 'Twitter', 'Airbnb', 'Stripe', 'Spotify',
  'Reddit', 'Oracle', 'Nvidia', 'Tesla', 'Lyft',
];

export default function CompaniesStrip() {
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const list = companies && companies.length > 0 ? companies : FALLBACK;

  // Split into 3 rows for a richer strip
  const third = Math.ceil(list.length / 3);
  const row1 = list.slice(0, third);
  const row2 = list.slice(third, third * 2);
  const row3 = list.slice(third * 2);

  return (
    <section id="companies" className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" />

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-r from-[#0B0B0F] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-l from-[#0B0B0F] to-transparent pointer-events-none" />

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 text-center mb-12 px-4"
      >
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.2em' }}
          whileInView={{ opacity: 1, letterSpacing: '0.25em' }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-bold uppercase text-[#FF7A00] mb-3 tracking-widest"
        >
          Questions From
        </motion.p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
          The World's{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #FF7A00, #FFB800, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Top Tech Companies
          </span>
        </h2>
        <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
          Curated questions from real interview experiences, online assessments,
          and verified candidate reports.
        </p>

        {/* Company count badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white/4 border border-white/8"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-400">
            <span className="text-white">{list.length}+</span> companies and counting
          </span>
        </motion.div>
      </motion.div>

      {/* Three rows of scrolling strips */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="space-y-3"
      >
        {row1.length > 0 && <Strip companies={row1} reverse={false} colorOffset={0} />}
        {row2.length > 0 && <Strip companies={row2} reverse={true}  colorOffset={3} />}
        {row3.length > 0 && <Strip companies={row3} reverse={false} colorOffset={6} />}
      </motion.div>
    </section>
  );
}
