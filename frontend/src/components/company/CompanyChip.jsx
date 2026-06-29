/**
 * CompanyChip.jsx
 *
 * A fully independent, memoised company card "chip".
 *
 * Performance contract:
 *  - Receives only flat primitive props. No object props that change reference
 *    on every parent render.
 *  - React.memo with a custom areEqual ensures it only re-renders when its own
 *    data changes, not when siblings or parent state changes.
 *  - Hover state is handled by direct DOM mutation (onMouseEnter/Leave) so no
 *    React setState is triggered for hover — zero re-renders on hover.
 *  - All style constant objects are defined at MODULE level so they are created
 *    once per app lifetime, never per render.
 *  - `will-change: transform` on the card root hints the GPU to keep it on its
 *    own compositor layer, making translateY(-3px) hover free.
 *  - `contain: layout style paint` limits browser reflow scope to just this card.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ORANGE, HOT_COMPANIES, getAvatarStyle, getTopTags, formatCompanyName } from '../../utils/companyUtils';

// ─── Module-level style constants (created once, never recreated) ─────────────
const BASE_CARD_STYLE = {
  backgroundColor: '#111111',
  transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s, background-color 0.18s',
  willChange: 'transform',
  contain: 'layout style paint',
};

const HOT_CARD_BORDER = 'rgba(255,107,26,0.30)';
const HOT_CARD_SHADOW = '0 0 20px rgba(255,107,26,0.06)';
const BASE_CARD_BORDER = '#1e1e1e';

const QS_BADGE_STYLE = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #222',
  color: '#4b5563',
};

const HOT_BADGE_STYLE = {
  backgroundColor: '#1a0800',
  color: ORANGE,
  border: '1px solid rgba(255,107,26,0.25)',
};

const TAG_STYLE = {
  backgroundColor: '#1a1a1a',
  color: '#6b7280',
  border: '1px solid #222',
};

const PRACTICE_BTN_BASE = {
  transition: 'none', // card already handles transition at parent level
};

const LINK_STYLE = { textDecoration: 'none' };

// ─── Gradient Progress Bar (pure CSS, no framer-motion for perf) ──────────────
function GradientBarStatic({ pct, color }) {
  return (
    <div className="relative rounded-full overflow-hidden" style={{ height: 5, backgroundColor: '#1a1a1a' }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.min(100, pct)}%`,
          background: pct > 0 ? `linear-gradient(90deg, ${color}90, ${color})` : 'transparent',
        }}
      />
    </div>
  );
}

// ─── CompanyChip ──────────────────────────────────────────────────────────────
function CompanyChipInner({ name, questionCount, topTagsJson, solvedCount }) {
  // topTagsJson is a JSON string so the parent can pass a stable primitive
  // (string comparison is cheap) rather than an array (always new reference).
  const topTags    = JSON.parse(topTagsJson);
  const displayName = formatCompanyName(name);
  const avatarStyle = getAvatarStyle(name.toUpperCase());
  const isHot       = HOT_COMPANIES.has(name.toLowerCase());
  const pct         = questionCount > 0 ? Math.round((solvedCount / questionCount) * 100) : 0;
  const accentColor = isHot ? ORANGE : avatarStyle.color;

  // Compose the initial card style — small object, only two dynamic fields.
  const cardStyle = {
    ...BASE_CARD_STYLE,
    border: `1px solid ${isHot ? HOT_CARD_BORDER : BASE_CARD_BORDER}`,
    boxShadow: isHot ? HOT_CARD_SHADOW : 'none',
  };

  // Practice button style — two dynamic fields.
  const practiceBtnStyle = {
    ...PRACTICE_BTN_BASE,
    backgroundColor: `${accentColor}12`,
    border: `1px solid ${accentColor}30`,
    color: accentColor,
  };

  // ── Hover handlers: direct DOM mutation → zero React re-renders on hover ──
  function onEnter(e) {
    const el = e.currentTarget;
    el.style.borderColor     = `${accentColor}50`;
    el.style.boxShadow       = `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${accentColor}22`;
    el.style.transform       = 'translateY(-3px)';
    el.style.backgroundColor = `${accentColor}06`;
  }
  function onLeave(e) {
    const el = e.currentTarget;
    el.style.borderColor     = isHot ? HOT_CARD_BORDER : BASE_CARD_BORDER;
    el.style.boxShadow       = isHot ? HOT_CARD_SHADOW : 'none';
    el.style.transform       = 'translateY(0)';
    el.style.backgroundColor = '#111111';
  }

  return (
    <div
      className="company-card company-card-enter relative flex flex-col rounded-2xl overflow-hidden"
      style={cardStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Top accent stripe */}
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: accentColor }} />

      <Link
        to={`/company/${name.toLowerCase()}`}
        className="flex flex-col h-full p-5 pt-6 gap-4"
        style={LINK_STYLE}
      >
        {/* Top row: Avatar & Question count badge */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <div
              className="w-12 h-12 flex items-center justify-center rounded-xl select-none text-[20px] font-black"
              style={{
                backgroundColor: avatarStyle.bg,
                color: avatarStyle.color,
                border: `1px solid ${avatarStyle.border}`,
              }}
            >
              {name[0].toUpperCase()}
            </div>
            {isHot && (
              <span
                className="absolute -top-1.5 -right-1.5 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase"
                style={HOT_BADGE_STYLE}
              >
                🔥 HOT
              </span>
            )}
          </div>

          <span className="text-[10px] font-semibold rounded-lg px-2.5 py-1" style={QS_BADGE_STYLE}>
            {questionCount} Qs
          </span>
        </div>

        {/* Company name + DSA tag pills */}
        <div className="flex-1 space-y-2">
          <h3 className="text-white font-black text-[15px] leading-tight capitalize truncate">
            {displayName}
          </h3>
          <div className="flex flex-wrap gap-1">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md"
                style={TAG_STYLE}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Progress tracker */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-semibold">
            <span style={{ color: '#4b5563' }}>{solvedCount} / {questionCount} solved</span>
            <span style={{ color: accentColor }} className="font-bold">{pct}%</span>
          </div>
          <GradientBarStatic pct={pct} color={accentColor} />
        </div>

        {/* CTA Button */}
        <div
          className="w-full text-center text-[12px] font-bold rounded-xl py-2.5"
          style={practiceBtnStyle}
        >
          Practice Questions →
        </div>
      </Link>
    </div>
  );
}

// Custom comparator: only re-render when actual data changes.
function areEqual(prev, next) {
  return (
    prev.name          === next.name          &&
    prev.questionCount === next.questionCount &&
    prev.solvedCount   === next.solvedCount   &&
    prev.topTagsJson   === next.topTagsJson
  );
}

export const CompanyChip = memo(CompanyChipInner, areEqual);
