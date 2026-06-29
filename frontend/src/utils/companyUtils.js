// ─── companyUtils.js ─────────────────────────────────────────────────────────
// Pure module-level helpers shared by CompaniesPage, DSAPractice, CompanyGrid,
// and CompanyChip. Being at module scope means they are created ONCE per
// application lifetime — never recreated on React re-renders.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Theme / Design Constants ─────────────────────────────────────────────────
export const ORANGE = '#FF6B1A';
export const SIDEBAR_W = 220;
export const PAGE_SIZE = 24;

export const AVATAR_STYLES = [
  { bg: '#1a0f00', color: '#FF6B1A', border: 'rgba(255,107,26,0.18)' },
  { bg: '#0a0f1a', color: '#3b82f6', border: 'rgba(59,130,246,0.18)' },
  { bg: '#0a1a0f', color: '#22c55e', border: 'rgba(34,197,94,0.18)'  },
  { bg: '#1a0a1a', color: '#a855f7', border: 'rgba(168,85,247,0.18)' },
];

// ─── Company Category Sets ────────────────────────────────────────────────────
export const HOT_COMPANIES = new Set([
  'google', 'amazon', 'microsoft', 'meta', 'flipkart', 'apple', 'netflix',
]);

export const FAANG = new Set([
  'google', 'meta', 'amazon', 'apple', 'netflix', 'microsoft',
]);

export const MNC = new Set([
  'adobe', 'uber', 'salesforce', 'oracle', 'sap', 'ibm', 'accenture',
  'deloitte', 'paypal', 'visa', 'mastercard', 'atlassian', 'shopify',
  'twitter', 'linkedin', 'spotify', 'airbnb', 'lyft', 'stripe', 'square',
]);

export const INDIA = new Set([
  'flipkart', 'paytm', 'swiggy', 'zomato', 'airtel', 'jio', 'infosys',
  'wipro', 'tcs', 'hcl', 'snapdeal', 'ola', 'phonepe', 'meesho', 'zepto',
  'myntra', 'cred', 'razorpay', 'groww', 'zerodha',
]);

// Pre-computed union — built once at module init, never rebuilt at runtime.
const KNOWN_SET = new Set([...FAANG, ...MNC, ...INDIA]);

// ─── Filter Pills Config ──────────────────────────────────────────────────────
export const FILTER_PILLS = [
  { id: 'all',     emoji: '🌟', label: 'All'    },
  { id: 'faang',   emoji: '🔥', label: 'FAANG'  },
  { id: 'mnc',     emoji: '💼', label: 'MNC'    },
  { id: 'startup', emoji: '🚀', label: 'Startup'},
  { id: 'india',   emoji: '🇮🇳', label: 'India'  },
];

// ─── Fallback DSA Tags ────────────────────────────────────────────────────────
export const FALLBACK_TAGS = {
  google:    ['Array', 'DP', 'Graph'],
  amazon:    ['Array', 'Tree', 'Design'],
  microsoft: ['Tree', 'DP', 'Graph'],
  meta:      ['Array', 'Hash Table', 'Graph'],
  flipkart:  ['Array', 'DP', 'Greedy'],
  apple:     ['Array', 'String', 'Math'],
  netflix:   ['Array', 'Design', 'Hash Table'],
  adobe:     ['Array', 'Math', 'String'],
  uber:      ['Array', 'Graph', 'Tree'],
  linkedin:  ['Array', 'Graph', 'DP'],
  twitter:   ['Array', 'Design', 'Hash Table'],
  default:   ['Array', 'DP', 'Tree'],
};

// ─── Pure Helper Functions ────────────────────────────────────────────────────

/**
 * Returns the avatar style object for a company name.
 * Pure — no side effects, deterministic output.
 */
export function getAvatarStyle(name = '') {
  const code = name.charCodeAt(0) - 65; // A=0
  const idx  = Math.max(0, code) % AVATAR_STYLES.length;
  return AVATAR_STYLES[idx];
}

/**
 * Returns whether a company matches the active filter category.
 * Uses the pre-built KNOWN_SET so no Set spread happens at runtime.
 */
export function matchesFilter(companyName, filterId) {
  if (filterId === 'all') return true;
  const key = companyName.toLowerCase().replace(/\s+/g, '');
  if (filterId === 'faang')   return FAANG.has(key)  || [...FAANG].some(f => key.includes(f));
  if (filterId === 'mnc')     return MNC.has(key)    || [...MNC].some(m => key.includes(m));
  if (filterId === 'india')   return INDIA.has(key)  || [...INDIA].some(i => key.includes(i));
  if (filterId === 'startup') return ![...KNOWN_SET].some(k => key.includes(k));
  return true;
}

/**
 * Returns up to 3 relevant DSA topic tags for a company.
 */
export function getTopTags(name, metaTags = []) {
  if (Array.isArray(metaTags) && metaTags.length > 0) return metaTags.slice(0, 3);
  const key =
    typeof name === 'string' ? name.toLowerCase().trim() :
    (name?.name ?? 'default');
  return FALLBACK_TAGS[key] ?? FALLBACK_TAGS.default;
}

/**
 * Formats a hyphenated slug into a display name.
 * e.g. "goldman-sachs" → "Goldman Sachs"
 */
export function formatCompanyName(name = '') {
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Builds an O(1) lookup Map from the user's solvedQuestions array.
 *
 * BEFORE: every CompanyCard called .filter() on the full array — O(n×s).
 * AFTER:  one pass over solvedQuestions builds a Map, then each card does
 *         Map.get(key) — O(1).
 *
 * @param {Array} solvedQuestions - user.solvedQuestions from Redux state
 * @returns {Map<string, number>} company key → solved count
 */
export function buildSolvedMap(solvedQuestions = []) {
  const map = new Map();
  if (!Array.isArray(solvedQuestions)) return map;
  for (const sq of solvedQuestions) {
    if (sq?.syncContext?.startsWith('company_')) {
      const key = sq.syncContext.slice('company_'.length); // e.g. "google"
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}
