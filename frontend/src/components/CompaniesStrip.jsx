/**
 * CompaniesStrip.jsx — Performance-optimised rewrite
 *
 * Changes vs original:
 *  1. `doubled` array is now memoised inside `Strip` — was `[...c,...c]` on
 *     every render, creating a new array reference each time.
 *  2. `Strip` is wrapped in `React.memo` — previously re-rendered whenever
 *     the parent CompaniesStrip re-rendered (e.g. React Query refetch).
 *  3. `onMouseEnter/Leave` handlers defined at module level — no closure
 *     allocation per chip on every render.
 *  4. Replaced the `motion.div` section reveal with a CSS `@keyframes fade-in`
 *     animation (already in index.css). This removes Framer-Motion from the
 *     landing page strip entirely.
 *  5. `motion.div` / `motion.p` in the header kept as-is — they run once on
 *     mount and are not in any hot re-render path.
 */
import { memo, useMemo } from 'react';
import { useQuery }      from '@tanstack/react-query';
import apiClient         from '../api/axios';

// ─── Company emoji map (module-level constant — never recreated) ───────────────
const COMPANY_EMOJI = {
  google: '🔍', amazon: '📦', microsoft: '🪟', meta: '🌐', apple: '🍎',
  uber: '🚗', adobe: '🎨', flipkart: '🛒', netflix: '🎬', linkedin: '💼',
  bytedance: '🎵', walmart: '🏪', bloomberg: '📊', atlassian: '🔷',
  goldman: '💰', salesforce: '☁️', twitter: '🐦', airbnb: '🏠',
  stripe: '💳', spotify: '🎧', reddit: '🤖', oracle: '🏛️',
  nvidia: '🎮', tesla: '⚡', lyft: '🚙', tiktok: '🎵',
  default: '🏢',
};

function getEmoji(name) {
  const key = name.toLowerCase().replace(/\s+/g, '');
  return (
    Object.entries(COMPANY_EMOJI).find(([k]) => key.includes(k))?.[1] ||
    COMPANY_EMOJI.default
  );
}

// ─── Glow colour palette ──────────────────────────────────────────────────────
const GLOW_COLORS = [
  '#FF7A00', '#FFB800', '#8B5CF6', '#22C55E',
  '#38BDF8', '#F472B6', '#FF7A00', '#FFB800',
];

// ─── Module-level hover handlers (stable refs, no closure per chip) ───────────
function onChipEnter(e) {
  const glow = e.currentTarget.dataset.glow;
  e.currentTarget.style.borderColor = `${glow}50`;
  e.currentTarget.style.color       = '#e2e8f0';
  e.currentTarget.style.background  = `${glow}0D`;
  e.currentTarget.style.boxShadow   = `0 0 16px ${glow}20`;
}
function onChipLeave(e) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
  e.currentTarget.style.color       = '';
  e.currentTarget.style.background  = 'rgba(255,255,255,0.03)';
  e.currentTarget.style.boxShadow   = 'none';
}

// ─── Static chip style (module-level — one object per app) ───────────────────
const CHIP_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
};

// ─── Strip — memoised so it doesn't re-render when parent re-fetches ─────────
const Strip = memo(function Strip({ companies, reverse = false, colorOffset = 0 }) {
  // Memoised: only recomputes when `companies` reference changes (i.e., after
  // a React Query refetch). Was previously a new array every render.
  const doubled = useMemo(() => [...companies, ...companies], [companies]);

  // Calculate dynamic duration to ensure premium, smooth, and modern marquee velocity.
  // We estimate the physical width of one set of companies based on chip layout details:
  // - Each chip has: 32px horizontal padding, 14px emoji space, 8px text gap, 2px border, and 12px gap between chips = 68px.
  // - We add approximately 7px per character for average character width at text-xs font.
  const duration = useMemo(() => {
    if (!companies || companies.length === 0) return 45; // Default recommended fallback duration
    
    const estimatedWidth = companies.reduce((acc, name) => {
      const cleanName = name.replace(/_/g, ' ');
      return acc + 68 + cleanName.length * 7;
    }, 0) - 12; // Subtract the last item's gap to get the exact width of one loop cycle

    // targetSpeed: Use an approximate scrolling speed of 70–80 pixels per second.
    // - If more companies are added, we automatically slow the animation slightly (down to 70 px/s) to keep it readable.
    // - If fewer companies are present, we automatically speed it up slightly (up to 80 px/s) to keep the flow premium.
    // We scale the speed linearly starting from 80 px/s, reducing it by 0.3 px/s per company beyond 5, clamped between 70 and 80 px/s.
    const speed = Math.max(70, Math.min(80, 80 - (companies.length - 5) * 0.3));

    // Calculate duration (seconds) needed to travel one content cycle (estimatedWidth pixels) at the target speed
    const calculatedDuration = estimatedWidth / speed;

    // Clamp the final duration to the specified limits:
    // - Minimum: 35 seconds (prevents excessively fast-paced loops when there are very few items)
    // - Recommended: 40–45 seconds (ideal balance for typical database list size)
    // - Maximum: 55 seconds (prevents excessively long loops when there are very many items)
    return Math.max(35, Math.min(55, calculatedDuration));
  }, [companies]);

  return (
    <div className="overflow-hidden relative">
      <div
        className={`flex gap-3 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
        style={{
          willChange: 'transform',
          animationDuration: `${duration}s`,
        }}
      >
        {doubled.map((c, i) => {
          const glow = GLOW_COLORS[(i + colorOffset) % GLOW_COLORS.length];
          return (
            <span
              key={`${c}-${i}`}
              // Store glow color as a data attribute so the module-level
              // handler can read it without closing over any per-render value.
              data-glow={glow}
              className="group inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-gray-400 rounded-xl px-4 py-2.5 cursor-default capitalize select-none"
              style={CHIP_STYLE}
              onMouseEnter={onChipEnter}
              onMouseLeave={onChipLeave}
            >
              <span className="text-sm leading-none">{getEmoji(c)}</span>
              <span>{c.replace(/_/g, ' ')}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
});

// ─── Fallback companies ───────────────────────────────────────────────────────
const FALLBACK = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Uber', 'Adobe', 'Flipkart', 'Goldman Sachs', 'Atlassian',
  'Netflix', 'LinkedIn', 'ByteDance', 'Walmart', 'Bloomberg',
  'Salesforce', 'Twitter', 'Airbnb', 'Stripe', 'Spotify',
  'Reddit', 'Oracle', 'Nvidia', 'Tesla', 'Lyft',
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function CompaniesStrip() {
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const list = companies?.length > 0 ? companies : FALLBACK;

  // Memoised row splits — only recomputes when `list` changes.
  const [row1, row2, row3] = useMemo(() => {
    const third = Math.ceil(list.length / 3);
    return [
      list.slice(0, third),
      list.slice(third, third * 2),
      list.slice(third * 2),
    ];
  }, [list]);

  return (
    <section id="companies" className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" />

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-r from-[#0B0B0F] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-l from-[#0B0B0F] to-transparent pointer-events-none" />

      {/* Section header — CSS fade-in (no Framer-Motion needed for a once-on-mount reveal) */}
      <div className="relative z-20 text-center mb-12 px-4 animate-fade-in">
        <p className="text-xs font-bold uppercase text-[#FF7A00] mb-3 tracking-widest">
          Questions From
        </p>
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
        <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white/4 border border-white/8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-400">
            <span className="text-white">{list.length}+</span> companies and counting
          </span>
        </div>
      </div>

      {/* Three rows of scrolling strips — each Strip is memoised */}
      <div className="space-y-3">
        {row1.length > 0 && <Strip companies={row1} reverse={false} colorOffset={0} />}
        {row2.length > 0 && <Strip companies={row2} reverse={true}  colorOffset={3} />}
        {row3.length > 0 && <Strip companies={row3} reverse={false} colorOffset={6} />}
      </div>
    </section>
  );
}
